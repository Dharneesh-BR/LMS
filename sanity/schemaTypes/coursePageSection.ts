import {defineArrayMember, defineField, defineType} from 'sanity'

export const coursePageMedia = defineType({
  name: 'coursePageMedia',
  title: 'Course Page Media',
  type: 'object',
  fields: [
    defineField({
      name: 'mediaType',
      title: 'Media Type',
      type: 'string',
      options: {
        list: [
          {title: 'Image', value: 'image'},
          {title: 'Video URL', value: 'video-url'},
          {title: 'Uploaded Video', value: 'video-file'},
        ],
        layout: 'radio',
      },
      initialValue: 'image',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true, accept: 'image/*'},
      hidden: ({parent}) => parent?.mediaType && parent.mediaType !== 'image',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative Text',
          type: 'string',
          validation: (Rule) => Rule.required().warning('Alternative text is important for accessibility.'),
        }),
      ],
    }),
    defineField({
      name: 'videoUrl',
      title: 'Video URL',
      type: 'url',
      hidden: ({parent}) => parent?.mediaType !== 'video-url',
      description: 'Use a public YouTube, Vimeo, Loom, or hosted video URL.',
    }),
    defineField({
      name: 'videoFile',
      title: 'Uploaded Video',
      type: 'file',
      options: {accept: 'video/*'},
      hidden: ({parent}) => parent?.mediaType !== 'video-file',
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
    }),
  ],
  preview: {
    select: {title: 'caption', subtitle: 'mediaType', media: 'image'},
  },
})

export const coursePageItem = defineType({
  name: 'coursePageItem',
  title: 'Course Page Item',
  type: 'object',
  fields: [
    defineField({name: 'title', title: 'Item Title', type: 'string'}),
    defineField({name: 'description', title: 'Item Description', type: 'text', rows: 3}),
    defineField({name: 'metric', title: 'Metric / Number', type: 'string'}),
    defineField({name: 'iconLabel', title: 'Icon Label', type: 'string'}),
    defineField({name: 'media', title: 'Item Media', type: 'coursePageMedia'}),
  ],
  preview: {
    select: {title: 'title', subtitle: 'description', media: 'media.image'},
  },
})

export const coursePageSection = defineType({
  name: 'coursePageSection',
  title: 'Course Page Section',
  type: 'object',
  fields: [
    defineField({
      name: 'sectionTitle',
      title: 'Section Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'sectionFormat',
      title: 'Section Design',
      type: 'string',
      options: {
        list: [
          {title: 'Image / Video + Content', value: 'content'},
          {title: 'Rich Text', value: 'rich-text'},
          {title: 'Simple List', value: 'list'},
          {title: 'Cards / Feature Grid', value: 'cards'},
          {title: 'Differentiators', value: 'differentiators'},
          {title: 'Accordion / Expandable List', value: 'accordion'},
          {title: 'Curriculum Preview', value: 'curriculum'},
          {title: 'Timeline / Agenda', value: 'timeline'},
          {title: 'FAQs', value: 'faqs'},
          {title: 'Outcomes', value: 'outcomes'},
          {title: 'Testimonials', value: 'testimonials'},
          {title: 'Stats / Metrics', value: 'stats'},
          {title: 'Media Gallery', value: 'media-gallery'},
          {title: 'Call To Action', value: 'cta'},
        ],
        layout: 'dropdown',
      },
      initialValue: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'intro',
      title: 'Section Introduction',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'body',
      title: 'Rich Text Body',
      type: 'array',
      of: [{type: 'block'}],
      hidden: ({parent}) => !['content', 'rich-text'].includes(parent?.sectionFormat || 'content'),
    }),
    defineField({
      name: 'media',
      title: 'Section Media',
      type: 'coursePageMedia',
      description: 'Optional image or video for this section.',
    }),
    defineField({
      name: 'items',
      title: 'List / Card / Outcome / Stat Items',
      type: 'array',
      hidden: ({parent}) =>
        !['content', 'list', 'cards', 'differentiators', 'accordion', 'outcomes', 'stats', 'media-gallery'].includes(
          parent?.sectionFormat || 'content',
        ),
      of: [defineArrayMember({type: 'coursePageItem'})],
    }),
    defineField({
      name: 'modules',
      title: 'Curriculum Preview Modules',
      type: 'array',
      hidden: ({parent}) => parent?.sectionFormat !== 'curriculum',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'title', title: 'Module Title', type: 'string', validation: (Rule) => Rule.required()}),
            defineField({name: 'description', title: 'Module Description', type: 'text', rows: 3}),
            defineField({name: 'lessons', title: 'Lessons / Topics', type: 'array', of: [{type: 'string'}]}),
            defineField({name: 'media', title: 'Module Media', type: 'coursePageMedia'}),
          ],
          preview: {
            select: {title: 'title', subtitle: 'description', media: 'media.image'},
          },
        }),
      ],
    }),
    defineField({
      name: 'timeline',
      title: 'Timeline / Agenda Items',
      type: 'array',
      hidden: ({parent}) => parent?.sectionFormat !== 'timeline',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'timeLabel', title: 'Time / Step Label', type: 'string'}),
            defineField({name: 'title', title: 'Agenda Title', type: 'string', validation: (Rule) => Rule.required()}),
            defineField({name: 'description', title: 'Agenda Description', type: 'text', rows: 3}),
            defineField({name: 'media', title: 'Agenda Media', type: 'coursePageMedia'}),
          ],
          preview: {
            select: {title: 'title', subtitle: 'timeLabel', media: 'media.image'},
          },
        }),
      ],
    }),
    defineField({
      name: 'faqs',
      title: 'FAQs',
      type: 'array',
      hidden: ({parent}) => parent?.sectionFormat !== 'faqs',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'question', title: 'Question', type: 'string', validation: (Rule) => Rule.required()}),
            defineField({name: 'answer', title: 'Answer', type: 'text', rows: 4, validation: (Rule) => Rule.required()}),
          ],
          preview: {
            select: {title: 'question', subtitle: 'answer'},
          },
        }),
      ],
    }),
    defineField({
      name: 'testimonials',
      title: 'Testimonials',
      type: 'array',
      hidden: ({parent}) => parent?.sectionFormat !== 'testimonials',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'quote', title: 'Quote', type: 'text', rows: 4, validation: (Rule) => Rule.required()}),
            defineField({name: 'name', title: 'Name', type: 'string'}),
            defineField({name: 'designation', title: 'Designation / Company', type: 'string'}),
            defineField({name: 'media', title: 'Person Media', type: 'coursePageMedia'}),
          ],
          preview: {
            select: {title: 'name', subtitle: 'quote', media: 'media.image'},
          },
        }),
      ],
    }),
    defineField({
      name: 'cta',
      title: 'Call To Action',
      type: 'object',
      hidden: ({parent}) => parent?.sectionFormat !== 'cta',
      fields: [
        defineField({name: 'headline', title: 'CTA Headline', type: 'string'}),
        defineField({name: 'description', title: 'CTA Description', type: 'text', rows: 3}),
        defineField({name: 'buttonLabel', title: 'Button Label', type: 'string', initialValue: 'Start course'}),
        defineField({
          name: 'buttonAction',
          title: 'Button Action',
          type: 'string',
          options: {
            list: [
              {title: 'Start This Course', value: 'start-course'},
              {title: 'External / Internal Link', value: 'link'},
            ],
            layout: 'radio',
          },
          initialValue: 'start-course',
        }),
        defineField({
          name: 'buttonUrl',
          title: 'Button URL',
          type: 'url',
          hidden: ({parent}) => parent?.buttonAction !== 'link',
        }),
      ],
    }),
  ],
  preview: {
    select: {title: 'sectionTitle', subtitle: 'sectionFormat', media: 'media.image'},
  },
})
