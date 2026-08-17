import { useEffect, useMemo, useState } from 'react'
import { listStudentCourses } from '../../courses/services/courses.service'
import { listProjectsByCourseAndOwner } from '../../projects/services/projects.service'
import type { Course, Project } from '../../../lib/database.types'

export const ALL_STUDENT_COURSES = '__ALL__'

export interface CourseWithProjects {
  course: Course
  projects: Project[]
}

export function useStudentCourseProjects(userId?: string) {
  const [courseData, setCourseData] = useState<CourseWithProjects[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterCourseId, setFilterCourseId] = useState<string>(ALL_STUDENT_COURSES)

  useEffect(() => {
    async function loadData() {
      if (!userId) return
      setLoading(true)
      setError(null)

      try {
        const courses = await listStudentCourses()
        const results = await Promise.all(
          courses.map(async (course) => {
            const projects = await listProjectsByCourseAndOwner(course.id, userId)
            return { course, projects }
          }),
        )
        setCourseData(results)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [userId])

  const visibleCourseData = useMemo(
    () => filterCourseId === ALL_STUDENT_COURSES
      ? courseData
      : courseData.filter((item) => item.course.id === filterCourseId),
    [courseData, filterCourseId],
  )
  const projects = useMemo(
    () => visibleCourseData.flatMap((item) => item.projects),
    [visibleCourseData],
  )
  const selectedCourse = courseData.find((item) => item.course.id === filterCourseId)?.course

  return {
    courseData,
    visibleCourseData,
    projects,
    selectedCourse,
    filterCourseId,
    setFilterCourseId,
    loading,
    error,
  }
}
