import {defineArrayMember, defineField, defineType} from 'sanity'

const departmentOptions = [
  {title: 'Sales', value: 'Sales'},
  {title: 'Marketing', value: 'Marketing'},
  {title: 'Operations', value: 'Operations'},
  {title: 'Finance', value: 'Finance'},
  {title: 'Human Resources', value: 'Human Resources'},
  {title: 'Product', value: 'Product'},
  {title: 'Design', value: 'Design'},
  {title: 'IT', value: 'IT'},
  {title: 'Admin', value: 'Admin'},
  {title: 'Leadership', value: 'Leadership'},
]

const designationOptions = [
  {title: 'Associate', value: 'Associate'},
  {title: 'Executive', value: 'Executive'},
  {title: 'Manager', value: 'Manager'},
  {title: 'Senior Manager', value: 'Senior Manager'},
  {title: 'Team Lead', value: 'Team Lead'},
  {title: 'Director', value: 'Director'},
  {title: 'Consultant', value: 'Consultant'},
  {title: 'Designer', value: 'Designer'},
  {title: 'Founder', value: 'Founder'},
  {title: 'Admin', value: 'Admin'},
]

function validateAudienceTags(values: unknown[] | undefined, label: string) {
  if (!values?.length) return true

  const normalizedValues = values.map((value) => String(value || '').trim())
  if (normalizedValues.some((value) => !value)) {
    return `Remove empty ${label} tags.`
  }

  const uniqueValues = new Set(normalizedValues.map((value) => value.toLowerCase()))
  if (uniqueValues.size !== normalizedValues.length) {
    return `Remove duplicate ${label} tags.`
  }

  return true
}

export const course = defineType({
  name: 'course',
  title: 'Course',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'targetDepartments',
      title: 'Target Departments',
      type: 'array',
      description: 'Departments this course is assigned to. Add at least one department before publishing.',
      of: [
        defineArrayMember({
          type: 'string',
          validation: (Rule) => Rule.required().error('Remove empty department tags.'),
        }),
      ],
      options: {
        list: departmentOptions,
      },
      validation: (Rule) =>
        Rule.required()
          .min(1)
          .custom((values) => validateAudienceTags(values, 'department')),
    }),
    defineField({
      name: 'targetDesignations',
      title: 'Target Designations',
      type: 'array',
      description: 'Designations or seniority levels this course is assigned to. Add at least one designation before publishing.',
      of: [
        defineArrayMember({
          type: 'string',
          validation: (Rule) => Rule.required().error('Remove empty designation tags.'),
        }),
      ],
      options: {
        list: designationOptions,
      },
      validation: (Rule) =>
        Rule.required()
          .min(1)
          .custom((values) => validateAudienceTags(values, 'designation')),
    }),
    defineField({
      name: 'mainImage',
      title: 'Course image',
      type: 'image',
      description: 'Used in the course listing card and the course detail banner.',
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          description: 'Describe the image for learners using assistive technology.',
          validation: (Rule) => Rule.required().warning('Alternative text is important for accessibility.'),
        }),
      ],
      validation: (Rule) => Rule.required().error('Upload a course image before publishing.'),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      of: [{type: 'block'}],
    }),
    defineField({
      name: 'landingPage',
      title: 'Course Detail Page',
      type: 'object',
      description: 'Public course page shown before the learner opens the syllabus.',
      fields: [
        defineField({
          name: 'eyebrow',
          title: 'Hero Eyebrow',
          type: 'string',
          initialValue: 'Magnafic Academy',
        }),
        defineField({
          name: 'headline',
          title: 'Hero Headline',
          type: 'string',
          description: 'Optional. The course title is used when this is blank.',
        }),
        defineField({
          name: 'shortDescription',
          title: 'Hero Description',
          type: 'text',
          rows: 3,
          description: 'Optional. The course excerpt is used when this is blank.',
        }),
        defineField({
          name: 'startButtonLabel',
          title: 'Start Button Label',
          type: 'string',
          initialValue: 'Start course',
        }),
        defineField({
          name: 'theme',
          title: 'Page Theme',
          type: 'string',
          options: {
            list: [
              {title: 'Dark Blue', value: 'dark'},
              {title: 'Light', value: 'light'},
              {title: 'Alternating', value: 'alternating'},
            ],
            layout: 'radio',
          },
          initialValue: 'alternating',
        }),
        defineField({
          name: 'sections',
          title: 'Course Detail Sections',
          type: 'array',
          description: 'Add and reorder complete page sections in the same manner as Magnafic Ad Pages.',
          of: [{type: 'coursePageSection'}],
        }),
        defineField({
          name: 'seoTitle',
          title: 'SEO Title',
          type: 'string',
          validation: (Rule) => Rule.max(70),
        }),
        defineField({
          name: 'seoDescription',
          title: 'SEO Description',
          type: 'text',
          rows: 3,
          validation: (Rule) => Rule.max(160),
        }),
      ],
    }),
    defineField({
      name: 'modules',
      title: 'Modules',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'module'}]}],
    }),
    defineField({
      name: 'finalAssessment',
      title: 'Final course assessment',
      type: 'reference',
      description: 'Optional. Learners must pass this after completing every lesson.',
      to: [{type: 'assessment'}],
    }),
    defineField({
      name: 'certificateTemplate',
      title: 'Certificate template',
      type: 'reference',
      description: 'Required before learners can generate a completion certificate.',
      to: [{type: 'certificateTemplate'}],
    }),
  ],
})
