import {defineArrayMember, defineField, defineType} from 'sanity'

type ObjectiveOption = {
  label?: string
  isCorrect?: boolean
}

type ObjectiveQuestionValue = {
  questionType?: string
  options?: ObjectiveOption[]
}

export const objectiveQuestion = defineType({
  name: 'objectiveQuestion',
  title: 'Objective question',
  type: 'object',
  fields: [
    defineField({
      name: 'prompt',
      title: 'Question',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'questionType',
      title: 'Question type',
      type: 'string',
      initialValue: 'singleChoice',
      options: {
        layout: 'radio',
        list: [
          {title: 'Single choice', value: 'singleChoice'},
          {title: 'Multiple choice', value: 'multipleChoice'},
          {title: 'True or false', value: 'trueFalse'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'options',
      title: 'Answer options',
      type: 'array',
      of: [defineArrayMember({type: 'objectiveOption'})],
      validation: (Rule) => Rule.required().min(2),
    }),
  ],
  validation: (Rule) =>
    Rule.custom((value: ObjectiveQuestionValue | undefined) => {
      if (!value) return true

      const options = value.options || []
      const correctCount = options.filter((option) => option.isCorrect).length

      if (value.questionType === 'trueFalse' && options.length !== 2) {
        return 'True or false questions must have exactly two answer options.'
      }
      if (value.questionType === 'multipleChoice' && correctCount < 1) {
        return 'Multiple choice questions need at least one correct answer.'
      }
      if (value.questionType !== 'multipleChoice' && correctCount !== 1) {
        return 'Single choice and true or false questions need exactly one correct answer.'
      }
      return true
    }),
  preview: {
    select: {title: 'prompt', subtitle: 'questionType'},
  },
})
