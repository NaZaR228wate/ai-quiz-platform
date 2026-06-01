from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.courses.schemas import CourseCreate, CourseRead, CourseUpdate
from app.modules.courses.service import create_course, delete_course, get_course, list_courses, update_course
from app.modules.users.models import User


router = APIRouter(prefix="/courses", tags=["courses"])


def get_current_teacher(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can manage courses")
    return current_user


@router.post("", response_model=CourseRead, status_code=status.HTTP_201_CREATED)
def create_course_endpoint(
    data: CourseCreate,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return create_course(db, current_teacher, data)


@router.get("", response_model=list[CourseRead])
def list_courses_endpoint(
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return list_courses(db, current_teacher)


@router.get("/{course_id}", response_model=CourseRead)
def get_course_endpoint(
    course_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return get_course(db, current_teacher, course_id)


@router.patch("/{course_id}", response_model=CourseRead)
def update_course_endpoint(
    course_id: int,
    data: CourseUpdate,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return update_course(db, current_teacher, course_id, data)


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course_endpoint(
    course_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    delete_course(db, current_teacher, course_id)
