from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.courses.models import Course
from app.modules.courses.schemas import CourseCreate, CourseUpdate
from app.modules.users.models import User


def create_course(db: Session, teacher: User, data: CourseCreate) -> Course:
    course = Course(
        teacher_id=teacher.id,
        title=data.title,
        description=data.description,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def list_courses(db: Session, teacher: User) -> list[Course]:
    statement = select(Course).where(Course.teacher_id == teacher.id).order_by(Course.id)
    return list(db.scalars(statement).all())


def get_course(db: Session, teacher: User, course_id: int) -> Course:
    statement = select(Course).where(Course.id == course_id, Course.teacher_id == teacher.id)
    course = db.scalar(statement)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


def update_course(db: Session, teacher: User, course_id: int, data: CourseUpdate) -> Course:
    course = get_course(db, teacher, course_id)
    fields = data.model_dump(exclude_unset=True)

    if fields.get("title") is not None:
        course.title = fields["title"]
    if "description" in fields:
        course.description = fields["description"]

    db.commit()
    db.refresh(course)
    return course


def delete_course(db: Session, teacher: User, course_id: int) -> None:
    course = get_course(db, teacher, course_id)
    db.delete(course)
    db.commit()
