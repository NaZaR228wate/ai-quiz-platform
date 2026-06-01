"""create materials

Revision ID: 0004_create_materials
Revises: 0003_create_topics
Create Date: 2026-05-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0004_create_materials"
down_revision: Union[str, Sequence[str], None] = "0003_create_topics"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "materials",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("topic_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_materials_topic_id"), "materials", ["topic_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_materials_topic_id"), table_name="materials")
    op.drop_table("materials")
