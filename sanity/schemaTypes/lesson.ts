import {defineField, defineType} from 'sanity'

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
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'module.title'},
  },
})
