from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.topics.schemas import TopicCreate, TopicRead, TopicUpdate
from app.modules.topics.service import create_topic, delete_topic, get_topic, list_topics, update_topic
from app.modules.users.models import User


router = APIRouter(tags=["topics"])


def get_current_teacher(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can manage topics")
    return current_user


@router.post("/courses/{course_id}/topics", response_model=TopicRead, status_code=status.HTTP_201_CREATED)
def create_topic_endpoint(
    course_id: int,
    data: TopicCreate,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return create_topic(db, current_teacher, course_id, data)


@router.get("/courses/{course_id}/topics", response_model=list[TopicRead])
def list_topics_endpoint(
    course_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return list_topics(db, current_teacher, course_id)


@router.get("/topics/{topic_id}", response_model=TopicRead)
def get_topic_endpoint(
    topic_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return get_topic(db, current_teacher, topic_id)


@router.patch("/topics/{topic_id}", response_model=TopicRead)
def update_topic_endpoint(
    topic_id: int,
    data: TopicUpdate,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return update_topic(db, current_teacher, topic_id, data)


@router.delete("/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_topic_endpoint(
    topic_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    delete_topic(db, current_teacher, topic_id)
