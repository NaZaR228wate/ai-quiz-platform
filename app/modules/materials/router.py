from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.materials.schemas import MaterialCreate, MaterialRead, MaterialUpdate
from app.modules.materials.service import (
    create_material,
    delete_material,
    get_material,
    list_materials,
    update_material,
)
from app.modules.users.models import User


router = APIRouter(tags=["materials"])


def get_current_teacher(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can manage materials")
    return current_user


@router.post("/topics/{topic_id}/materials", response_model=MaterialRead, status_code=status.HTTP_201_CREATED)
def create_material_endpoint(
    topic_id: int,
    data: MaterialCreate,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return create_material(db, current_teacher, topic_id, data)


@router.get("/topics/{topic_id}/materials", response_model=list[MaterialRead])
def list_materials_endpoint(
    topic_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return list_materials(db, current_teacher, topic_id)


@router.get("/materials/{material_id}", response_model=MaterialRead)
def get_material_endpoint(
    material_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return get_material(db, current_teacher, material_id)


@router.patch("/materials/{material_id}", response_model=MaterialRead)
def update_material_endpoint(
    material_id: int,
    data: MaterialUpdate,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return update_material(db, current_teacher, material_id, data)


@router.delete("/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material_endpoint(
    material_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    delete_material(db, current_teacher, material_id)
