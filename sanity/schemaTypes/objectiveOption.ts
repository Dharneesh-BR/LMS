import {defineField, defineType} from 'sanity'

export const objectiveOption = defineType({
  name: 'objectiveOption',
  title: 'Answer option',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Answer',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'isCorrect',
      title: 'Correct answer',
      type: 'boolean',
      initialValue: false,
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {title: 'label', isCorrect: 'isCorrect'},
    prepare({title, isCorrect}) {
      return {
        title,
        subtitle: isCorrect ? 'Correct answer' : 'Incorrect answer',
      }
    },
  },
})
