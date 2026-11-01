import {defineArrayMember, defineField, defineType} from 'sanity'
import {KnowledgeReindexInput} from '../components/KnowledgeReindexInput'

export const courseChatbot = defineType({
  name: 'courseChatbot',
  title: 'Course Chatbot',
  type: 'object',
  fields: [
    defineField({
      name: 'reindexRequestedAt', title: 'Reprocess Documents', type: 'datetime',
      description: 'Request reprocessing, then publish the course. Use this after a processing failure or timeout.',
      components: {input: KnowledgeReindexInput},
    }),
    defineField({
      name: 'processing',
      title: 'Document Processing Status',
      type: 'object',
      readOnly: true,
      description: 'Updated by the indexing worker after publishing. Ready means document search is available, not that AI answering is enabled. Republish to retry failed processing.',
      fields: [
        defineField({name: 'status', title: 'Status', type: 'string'}),
        defineField({name: 'updatedAt', title: 'Last updated', type: 'datetime'}),
        defineField({name: 'revision', title: 'Source revision', type: 'string'}),
        defineField({name: 'error', title: 'Processing error', type: 'text', rows: 3}),
      ],
    }),
    defineField({
      name: 'enabled',
      title: 'Enable course chatbot',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'documents',
      title: 'Chatbot Documents',
      type: 'array',
      description: 'Approved course-wide resources only. Do not upload assessment answer keys or personal information. Use searchable PDFs, UTF-8 TXT, or Markdown files, up to 10 MB each.',
      of: [defineArrayMember({
        name: 'knowledgeDocument',
        title: 'Knowledge Document',
        type: 'object',
        fields: [
          defineField({name: 'title', title: 'Document title', type: 'string', validation: (rule) => rule.required().max(160)}),
          defineField({
            name: 'file', title: 'Document', type: 'file',
            options: {accept: '.pdf,.txt,.md'},
            validation: (rule) => rule.required(),
          }),
        ],
        preview: {select: {title: 'title', subtitle: 'file.asset.originalFilename'}},
      })],
      validation: (rule) => rule.max(10).custom((documents, context) => {
        const parent = context.parent as {enabled?: boolean} | undefined
        if (parent?.enabled && !documents?.length) return 'Add at least one approved document before enabling the chatbot.'
        const references = (documents || []).map((item) => (item as {file?: {asset?: {_ref?: string}}}).file?.asset?._ref).filter(Boolean)
        return new Set(references).size === references.length || 'Remove duplicate document uploads.'
      }),
    }),
  ],
})
