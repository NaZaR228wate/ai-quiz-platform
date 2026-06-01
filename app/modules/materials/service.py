from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.courses.models import Course
from app.modules.materials.models import Material
from app.modules.materials.schemas import MaterialCreate, MaterialUpdate
from app.modules.topics.models import Topic
from app.modules.topics.service import get_topic
from app.modules.users.models import User


def create_material(db: Session, teacher: User, topic_id: int, data: MaterialCreate) -> Material:
    topic = get_topic(db, teacher, topic_id)
    material = Material(
        topic_id=topic.id,
        title=data.title,
        content_text=data.content_text,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


def list_materials(db: Session, teacher: User, topic_id: int) -> list[Material]:
    get_topic(db, teacher, topic_id)
    statement = select(Material).where(Material.topic_id == topic_id).order_by(Material.id)
    return list(db.scalars(statement).all())


def get_material(db: Session, teacher: User, material_id: int) -> Material:
    statement = (
        select(Material)
        .join(Topic, Material.topic_id == Topic.id)
        .join(Course, Topic.course_id == Course.id)
        .where(Material.id == material_id, Course.teacher_id == teacher.id)
    )
    material = db.scalar(statement)
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    return material


def update_material(db: Session, teacher: User, material_id: int, data: MaterialUpdate) -> Material:
    material = get_material(db, teacher, material_id)
    fields = data.model_dump(exclude_unset=True)

    if fields.get("title") is not None:
        material.title = fields["title"]
    if fields.get("content_text") is not None:
        material.content_text = fields["content_text"]

    db.commit()
    db.refresh(material)
    return material


def delete_material(db: Session, teacher: User, material_id: int) -> None:
    material = get_material(db, teacher, material_id)
    db.delete(material)
    db.commit()
