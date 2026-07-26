import { readFile, writeFile } from 'node:fs/promises'

const contentPath = new URL('../demo-content.json', import.meta.url)
const documents = JSON.parse(await readFile(contentPath, 'utf8'))
const testIds = new Set([
  'magnafic-assessment-test-workflow-inventory',
  'magnafic-assessment-test-ai-prioritization',
  'magnafic-assessment-test-ai-final',
  'magnafic-lesson-primer-content-only',
  'magnafic-certificate-template-default',
])
const content = documents.filter((document) => !testIds.has(document._id))

function reference(_ref) {
  return {_type: 'reference', _ref}
}

function option(_key, label, isCorrect) {
  return {_type: 'objectiveOption', _key, label, isCorrect}
}

function question(_key, prompt, questionType, options) {
  return {_type: 'objectiveQuestion', _key, prompt, questionType, options}
}

function portableText(_key, text) {
  return [
    {
      _type: 'block',
      _key,
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: `${_key}-span`,
          text,
          marks: [],
        },
      ],
    },
  ]
}

function firstText(document) {
  const text = document.content
    ?.flatMap((block) => block.children || [])
    .map((child) => child.text)
    .filter(Boolean)
    .join(' ')
    .trim()

  return text ? text.slice(0, 220) : undefined
}

function buildCourseLandingPage(course) {
  const courseModules = (course.modules || [])
    .map((moduleReference) =>
      content.find(
        (document) =>
          document._type === 'module' && document._id === moduleReference._ref,
      ),
    )
    .filter(Boolean)
    .sort((left, right) => (left.order || 0) - (right.order || 0))

  const curriculumModules = courseModules.map((module, moduleIndex) => {
    const lessons = content
      .filter(
        (document) =>
          document._type === 'lesson' && document.module?._ref === module._id,
      )
      .sort((left, right) => (left.order || 0) - (right.order || 0))

    return {
      _type: 'object',
      _key: `${course._id}-module-${moduleIndex + 1}`,
      title: module.title,
      description: `${lessons.length} focused lesson${lessons.length === 1 ? '' : 's'}`,
      lessons: lessons.map((lesson) => lesson.title),
    }
  })

  return {
    eyebrow: 'Magnafic Academy',
    headline: course.title,
    shortDescription: course.excerpt,
    startButtonLabel: 'Start course',
    theme: 'alternating',
    seoTitle: `${course.title} | Magnafic Academy`,
    seoDescription: course.excerpt,
    sections: [
      {
        _type: 'coursePageSection',
        _key: `${course._id}-overview`,
        sectionTitle: 'Build capability through practical execution',
        sectionFormat: 'content',
        intro: course.excerpt,
        body:
          course.description ||
          portableText(
            `${course._id}-overview-copy`,
            'Learn through practical lessons designed for immediate application.',
          ),
      },
      {
        _type: 'coursePageSection',
        _key: `${course._id}-outcomes`,
        sectionTitle: 'What you will take away',
        sectionFormat: 'outcomes',
        intro: 'Complete the course with a repeatable approach you can use in real work.',
        items: [
          {
            _type: 'coursePageItem',
            _key: `${course._id}-outcome-clarity`,
            title: 'Sharper decisions',
            description: 'Use structured frameworks to identify priorities and act with clarity.',
          },
          {
            _type: 'coursePageItem',
            _key: `${course._id}-outcome-systems`,
            title: 'Practical systems',
            description: 'Turn course concepts into repeatable operating routines.',
          },
          {
            _type: 'coursePageItem',
            _key: `${course._id}-outcome-progress`,
            title: 'Measurable progress',
            description: 'Track lesson completion and resume from your last learning point.',
          },
        ],
      },
      {
        _type: 'coursePageSection',
        _key: `${course._id}-curriculum`,
        sectionTitle: 'Course curriculum',
        sectionFormat: 'curriculum',
        intro: 'Preview the learning path before you start.',
        modules: curriculumModules,
      },
      {
        _type: 'coursePageSection',
        _key: `${course._id}-faqs`,
        sectionTitle: 'Questions before you begin',
        sectionFormat: 'faqs',
        faqs: [
          {
            _type: 'object',
            _key: `${course._id}-faq-progress`,
            question: 'Can I continue where I stopped?',
            answer:
              'Yes. Your lesson progress is saved so you can return and continue from your latest learning point.',
          },
          {
            _type: 'object',
            _key: `${course._id}-faq-order`,
            question: 'How are lessons unlocked?',
            answer:
              'The first lesson is available when you start. Each following lesson unlocks after the previous lesson and any required assessment are completed.',
          },
        ],
      },
      {
        _type: 'coursePageSection',
        _key: `${course._id}-cta`,
        sectionTitle: 'Ready to begin?',
        sectionFormat: 'cta',
        intro: 'Start the course and work through the curriculum at your own pace.',
        cta: {
          headline: 'Ready to begin?',
          description: 'Open the syllabus and start with the first lesson.',
          buttonLabel: 'Start course',
          buttonAction: 'start-course',
        },
      },
    ],
  }
}

for (const document of content) {
  if (document._type === 'course') {
    delete document.price
    delete document.finalAssessment
    document.certificateTemplate = reference('magnafic-certificate-template-default')
  }

  if (document._type === 'lesson') {
    document.summary ||= firstText(document)
    delete document.assessment
  }
}

const workflowAssessment = {
  _id: 'magnafic-assessment-test-workflow-inventory',
  _type: 'assessment',
  title: 'Workflow Inventory Knowledge Check',
  instructions: 'Answer both questions to unlock the next lesson.',
  passingPercentage: 70,
  maxAttempts: 5,
  randomizeOptions: false,
  questions: [
    question(
      'workflow-purpose',
      'What should an AI workflow inventory capture first?',
      'singleChoice',
      [
        option('workflow-purpose-a', 'Recurring decisions and repeated operational tasks', true),
        option('workflow-purpose-b', 'Only the tools already purchased by the company', false),
        option('workflow-purpose-c', 'Every employee job title', false),
      ],
    ),
    question(
      'workflow-signals',
      'Which signals make a workflow a useful AI candidate?',
      'multipleChoice',
      [
        option('workflow-signals-a', 'It repeats frequently', true),
        option('workflow-signals-b', 'It has a clear output', true),
        option('workflow-signals-c', 'It has no accountable owner', false),
      ],
    ),
  ],
}

const prioritizationAssessment = {
  _id: 'magnafic-assessment-test-ai-prioritization',
  _type: 'assessment',
  title: 'AI Prioritization Check',
  instructions: 'Confirm the principle before continuing.',
  passingPercentage: 100,
  randomizeOptions: false,
  questions: [
    question(
      'prioritization-principle',
      'A high-value use case should be implemented even when its data is unavailable.',
      'trueFalse',
      [
        option('prioritization-false', 'False', true),
        option('prioritization-true', 'True', false),
      ],
    ),
  ],
}

const finalAssessment = {
  _id: 'magnafic-assessment-test-ai-final',
  _type: 'assessment',
  title: 'AI Execution Systems Final Test',
  instructions: 'Pass this test after completing all lessons to finish the course.',
  passingPercentage: 70,
  maxAttempts: 5,
  randomizeOptions: true,
  questions: [
    question(
      'final-handoff',
      'What belongs in a safe human-agent handoff?',
      'multipleChoice',
      [
        option('final-handoff-a', 'A defined approval owner', true),
        option('final-handoff-b', 'An exception path', true),
        option('final-handoff-c', 'Hidden autonomous decisions', false),
      ],
    ),
    question(
      'final-impact',
      'Which metric best demonstrates operating impact?',
      'singleChoice',
      [
        option('final-impact-a', 'Reduced cycle time with maintained quality', true),
        option('final-impact-b', 'The number of AI tools installed', false),
        option('final-impact-c', 'The number of prompts written', false),
      ],
    ),
  ],
}

const certificateTemplate = {
  _id: 'magnafic-certificate-template-default',
  _type: 'certificateTemplate',
  title: 'Magnafic Academy Default Certificate',
  version: 1,
  heading: 'Certificate of Completion',
  introText: 'This certifies that',
  completionText: 'has successfully completed {{courseTitle}}',
  footerText: 'Issued by Magnafic Academy',
  verificationText: 'Scan to verify this certificate',
  primaryColor: '#000047',
  accentColor: '#12cfe0',
  signatories: [
    {
      _type: 'certificateSignatory',
      _key: 'magnafic-authorized-signatory',
      name: 'Authorized Signatory',
      designation: 'Magnafic Academy',
    },
  ],
}

const workflowLesson = content.find((document) => document._id === 'magnafic-lesson-ai-workflow-inventory')
const prioritizationLesson = content.find((document) => document._id === 'magnafic-lesson-ai-prioritization')
const aiCourse = content.find((document) => document._id === 'magnafic-course-ai-execution-systems')

if (!workflowLesson || !prioritizationLesson || !aiCourse) {
  throw new Error('Expected AI course seed documents are missing')
}

workflowLesson.assessment = reference(workflowAssessment._id)
prioritizationLesson.assessment = reference(prioritizationAssessment._id)
aiCourse.finalAssessment = reference(finalAssessment._id)

content.push(
  {
    _id: 'magnafic-lesson-primer-content-only',
    _type: 'lesson',
    title: 'Content-Only Completion Test',
    summary: 'A test lesson without video that verifies manual completion and sequential unlocking.',
    module: reference('magnafic-module-primer-orientation'),
    duration: '5 min',
    order: 3,
    content: [
      {
        _type: 'block',
        _key: 'primer-content-only-block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'primer-content-only-span',
            text: 'Read this lesson and use Mark complete to verify that non-video lessons unlock correctly.',
            marks: [],
          },
        ],
      },
    ],
  },
  workflowAssessment,
  prioritizationAssessment,
  finalAssessment,
  certificateTemplate,
)

for (const document of content) {
  if (document._type === 'course') {
    document.landingPage = buildCourseLandingPage(document)
  }
}

await writeFile(contentPath, `${JSON.stringify(content, null, 2)}\n`)

const counts = content.reduce((result, document) => {
  result[document._type] = (result[document._type] || 0) + 1
  return result
}, {})

console.log('Prepared idempotent Sanity test content:', counts)
