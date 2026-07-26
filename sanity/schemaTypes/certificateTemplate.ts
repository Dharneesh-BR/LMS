import {defineArrayMember, defineField, defineType} from 'sanity'

export const certificateTemplate = defineType({
  name: 'certificateTemplate',
  title: 'Certificate Template',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Template title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'version',
      title: 'Template version',
      type: 'number',
      initialValue: 1,
      validation: (Rule) => Rule.required().integer().min(1),
    }),
    defineField({
      name: 'heading',
      title: 'Certificate heading',
      type: 'string',
      initialValue: 'Certificate of Completion',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'introText',
      title: 'Introduction text',
      type: 'string',
      initialValue: 'This certifies that',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'completionText',
      title: 'Completion statement',
      type: 'text',
      rows: 3,
      description:
        'Available placeholders: {{learnerName}}, {{courseTitle}}, {{completionDate}}, {{completionTime}}, {{certificateNumber}}.',
      initialValue: 'has successfully completed {{courseTitle}}',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'footerText',
      title: 'Footer text',
      type: 'string',
      initialValue: 'Issued by Magnafic Academy',
    }),
    defineField({
      name: 'verificationText',
      title: 'Verification text',
      type: 'string',
      initialValue: 'Scan to verify this certificate',
    }),
    defineField({
      name: 'primaryColor',
      title: 'Primary color',
      type: 'string',
      initialValue: '#000047',
      validation: (Rule) => Rule.regex(/^#[0-9a-fA-F]{6}$/, {name: 'hex color'}),
    }),
    defineField({
      name: 'accentColor',
      title: 'Accent color',
      type: 'string',
      initialValue: '#12cfe0',
      validation: (Rule) => Rule.regex(/^#[0-9a-fA-F]{6}$/, {name: 'hex color'}),
    }),
    defineField({
      name: 'backgroundImage',
      title: 'Certificate background',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'logo',
      title: 'Certificate logo',
      type: 'image',
    }),
    defineField({
      name: 'signatories',
      title: 'Signatories',
      type: 'array',
      validation: (Rule) => Rule.max(2),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'certificateSignatory',
          fields: [
            defineField({
              name: 'name',
              title: 'Name',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'designation',
              title: 'Designation',
              type: 'string',
            }),
            defineField({
              name: 'signature',
              title: 'Signature image',
              type: 'image',
            }),
          ],
        }),
      ],
    }),
  ],
})
