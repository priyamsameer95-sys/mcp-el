import { getCourses } from '../utils/data-loader.js';

export async function handleListCourses() {
  const courses = getCourses();
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(courses, null, 2),
    }],
  };
}
