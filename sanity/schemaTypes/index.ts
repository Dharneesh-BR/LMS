import {assessment} from './assessment'
import {certificateTemplate} from './certificateTemplate'
import {course} from './course'
import {coursePageItem, coursePageMedia, coursePageSection} from './coursePageSection'
import {lesson} from './lesson'
import {module} from './module'
import {objectiveOption} from './objectiveOption'
import {objectiveQuestion} from './objectiveQuestion'

export const schemaTypes = [
  objectiveOption,
  objectiveQuestion,
  assessment,
  certificateTemplate,
  coursePageMedia,
  coursePageItem,
  coursePageSection,
  course,
  module,
  lesson,
]
