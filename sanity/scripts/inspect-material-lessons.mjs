import {createClient} from '@sanity/client'

const client = createClient({
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'kdugdssj',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  apiVersion: '2026-07-26',
  useCdn: false,
})

const lessons = await client.fetch(`*[
  _type == "lesson" &&
  count(materials) > 0
] | order(module->order asc, order asc) {
  _id,
  title,
  "module": module->title,
  "courseId": module->course._ref,
  "assessmentId": assessment._ref,
  materials[]{
    title,
    resourceType,
    "fileName": file.asset->originalFilename
  }
}`)

console.log(JSON.stringify(lessons, null, 2))
