from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.courses.models import Course
from app.modules.courses.service import get_course
from app.modules.topics.models import Topic
from app.modules.topics.schemas import TopicCreate, TopicUpdate
from app.modules.users.models import User


def create_topic(db: Session, teacher: User, course_id: int, data: TopicCreate) -> Topic:
    course = get_course(db, teacher, course_id)
    topic = Topic(
        course_id=course.id,
        title=data.title,
        description=data.description,
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


def list_topics(db: Session, teacher: User, course_id: int) -> list[Topic]:
    get_course(db, teacher, course_id)
    statement = select(Topic).where(Topic.course_id == course_id).order_by(Topic.id)
    return list(db.scalars(statement).all())


def get_topic(db: Session, teacher: User, topic_id: int) -> Topic:
    statement = (
        select(Topic)
        .join(Course, Topic.course_id == Course.id)
        .where(Topic.id == topic_id, Course.teacher_id == teacher.id)
    )
    topic = db.scalar(statement)
    if topic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
    return topic


def update_topic(db: Session, teacher: User, topic_id: int, data: TopicUpdate) -> Topic:
    topic = get_topic(db, teacher, topic_id)
    fields = data.model_dump(exclude_unset=True)

    if fields.get("title") is not None:
        topic.title = fields["title"]
    if "description" in fields:
        topic.description = fields["description"]

    db.commit()
    db.refresh(topic)
    return topic


def delete_topic(db: Session, teacher: User, topic_id: int) -> None:
    topic = get_topic(db, teacher, topic_id)
    db.delete(topic)
    db.commit()
