import {defineField, defineType} from 'sanity'

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
