export function applySequentialLessonAccess(
  course,
  completedLessonIds,
  { transformUnlocked = (lesson) => lesson } = {}
) {
  let sequenceOpen = true;

  return {
    ...course,
    modules: course.modules?.map((module) => ({
      ...module,
      lessons: module.lessons?.map((lesson) => {
        const unlocked = sequenceOpen;
        if (!completedLessonIds.has(lesson._id)) {
          sequenceOpen = false;
        }

        if (unlocked) {
          return {
            ...transformUnlocked(lesson),
            locked: false
          };
        }

        const { videoUrl, materials, content, ...lockedLesson } = lesson;
        return {
          ...lockedLesson,
          locked: true
        };
      })
    }))
  };
}
