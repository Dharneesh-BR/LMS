import {createClient} from '@sanity/client'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'kdugdssj'
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'
const client = createClient({
  projectId,
  dataset,
  apiVersion: '2026-07-25',
  useCdn: false,
})

const result = await client.fetch(`{
  "courses": count(*[_type == "course"]),
  "lessons": count(*[_type == "lesson"]),
  "assessments": count(*[_type == "assessment"]),
  "certificateTemplates": count(*[_type == "certificateTemplate"]),
  "coursesWithCertificateTemplate": count(*[_type == "course" && defined(certificateTemplate)]),
  "coursesWithLandingPage": count(*[
    _type == "course" &&
    defined(landingPage.headline) &&
    count(landingPage.sections) >= 5
  ]),
  "lessonsWithSummary": count(*[_type == "lesson" && defined(summary)]),
  "lessonsWithAssessment": count(*[_type == "lesson" && defined(assessment)]),
  "coursesWithFinalAssessment": count(*[_type == "course" && defined(finalAssessment)]),
  "contentOnlyTest": count(*[
    _id == "magnafic-lesson-primer-content-only" &&
    !defined(videoUrl)
  ]),
  "testAssessments": *[
    _type == "assessment" &&
    _id match "magnafic-assessment-test-*"
  ] | order(_id asc) {
    "id": _id,
    "questions": count(questions)
  }
}`)

console.log(JSON.stringify({projectId, dataset, ...result}, null, 2))

const valid =
  result.courses >= 4 &&
  result.lessons >= 19 &&
  result.assessments >= 3 &&
  result.certificateTemplates >= 1 &&
  result.coursesWithCertificateTemplate >= 4 &&
  result.coursesWithLandingPage >= 4 &&
  result.lessonsWithSummary >= 19 &&
  result.lessonsWithAssessment >= 2 &&
  result.coursesWithFinalAssessment >= 1 &&
  result.contentOnlyTest === 1 &&
  result.testAssessments.length === 3 &&
  result.testAssessments.every((assessment) => assessment.questions > 0)

if (!valid) {
  throw new Error('Sanity test data verification failed')
}

console.log('Sanity test data verification passed.')
