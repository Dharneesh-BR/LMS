import {defineArrayMember, defineField, defineType} from 'sanity'

type LessonMaterial = {
  resourceType?: string
  file?: {
    asset?: {
      _ref?: string
    }
  }
}

function isLessonMaterial(value: unknown): value is LessonMaterial {
  return Boolean(value && typeof value === 'object')
}

export const lesson = defineType({
  name: 'lesson',
  title: 'Lesson',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Lesson Summary',
      type: 'text',
      rows: 3,
      description: 'Optional short description shown with this lesson in the course outline.',
      validation: (Rule) => Rule.max(240).warning('Keep the summary under 240 characters for easy scanning.'),
    }),
    defineField({
      name: 'module',
      title: 'Module',
      type: 'reference',
      to: [{type: 'module'}],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'videoUrl',
      title: 'Vimeo Video URL',
      type: 'url',
      description: 'Paste a Vimeo share URL or player URL. Keep the privacy hash on unlisted videos.',
      validation: (Rule) =>
        Rule.uri({scheme: ['https']}).custom((value) => {
          if (!value) return true

          try {
            const url = new URL(value)
            const allowedHosts = ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']
            if (!allowedHosts.includes(url.hostname)) return 'Use a Vimeo URL'

            const path = url.pathname.split('/').filter(Boolean)
            const videoId = path.find((part) => /^\d+$/.test(part))
            return videoId ? true : 'Vimeo URL must contain a numeric video ID'
          } catch {
            return 'Enter a valid Vimeo URL'
          }
        }),
    }),
    defineField({
      name: 'materials',
      title: 'PPT & PDF Materials',
      type: 'array',
      description:
        'Add a PDF, PowerPoint lesson, or optional reference file. Lessons can contain files, video, or both.',
      of: [
        defineArrayMember({
          name: 'lessonMaterial',
          title: 'Lesson Material',
          type: 'object',
          fields: [
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'resourceType',
              title: 'Material Type',
              type: 'string',
              initialValue: 'lesson',
              options: {
                layout: 'radio',
                list: [
                  {title: 'Lesson content', value: 'lesson'},
                  {title: 'Reference material', value: 'reference'},
                ],
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'file',
              title: 'PDF or PowerPoint File',
              type: 'file',
              options: {
                accept: '.pdf,.ppt,.pptx',
              },
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: {
              title: 'title',
              resourceType: 'resourceType',
              fileName: 'file.asset.originalFilename',
            },
            prepare({title, resourceType, fileName}) {
              return {
                title,
                subtitle: `${resourceType === 'reference' ? 'Reference' : 'Lesson content'}${fileName ? ` · ${fileName}` : ''}`,
              }
            },
          },
        }),
      ],
      validation: (Rule) => [
        Rule.max(10).warning('Keep lesson materials focused and easy to scan.'),
        Rule.custom((materials, context) => {
            const lessonMaterials = Array.isArray(materials)
              ? materials.filter(isLessonMaterial)
              : []
            const primaryMaterials =
              lessonMaterials.filter((material) => material.resourceType !== 'reference')

            if (primaryMaterials.length > 1) {
              return 'Use only one Lesson content file. Mark all supporting files as Reference material.'
            }
            if (context.document?.videoUrl && primaryMaterials.length > 0) {
              return 'This lesson already has a video. Mark every attached file as Reference material.'
            }

            const legacyPresentation = primaryMaterials.find((material) =>
              material.file?.asset?._ref?.toLowerCase().endsWith('-ppt'),
            )
            if (legacyPresentation) {
              return 'Tracked lesson presentations must be uploaded as .pptx or PDF. Legacy .ppt files cannot report the current slide.'
            }

            return true
          }),
      ],
    }),
    defineField({
      name: 'duration',
      title: 'Duration',
      type: 'string',
      description: 'Example: 12 min',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      initialValue: 0,
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [{type: 'block'}],
      validation: (Rule) =>
        Rule.custom((content, context) => {
          const hasVideo = Boolean(context.document?.videoUrl)
          const materials = Array.isArray(context.document?.materials)
            ? context.document.materials.filter(isLessonMaterial)
            : []
          const hasPrimaryMaterial = Boolean(
            materials.some((material) => material.resourceType !== 'reference'),
          )

          if (!hasVideo && !hasPrimaryMaterial && !content?.length) {
            return 'Add a video, one Lesson content PDF/PPTX, or written content. Reference materials do not complete a lesson.'
          }

          return true
        }),
    }),
    defineField({
      name: 'assessment',
      title: 'Lesson assessment',
      type: 'reference',
      description: 'Optional. Learners must pass this assessment before the next lesson unlocks.',
      to: [{type: 'assessment'}],
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'module.title'},
  },
})
