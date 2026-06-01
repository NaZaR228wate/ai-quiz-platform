"""create quiz sessions

Revision ID: 0007_create_quiz_sessions
Revises: 0006_create_attempts
Create Date: 2026-05-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0007_create_quiz_sessions"
down_revision: Union[str, Sequence[str], None] = "0006_create_attempts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "quiz_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("quiz_id", sa.Integer(), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=6), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["quiz_id"], ["quizzes.id"]),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_quiz_sessions_code"), "quiz_sessions", ["code"], unique=True)
    op.create_index(op.f("ix_quiz_sessions_quiz_id"), "quiz_sessions", ["quiz_id"], unique=False)
    op.create_index(op.f("ix_quiz_sessions_teacher_id"), "quiz_sessions", ["teacher_id"], unique=False)

    with op.batch_alter_table("quiz_attempts") as batch_op:
        batch_op.add_column(sa.Column("session_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_quiz_attempts_session_id_quiz_sessions",
            "quiz_sessions",
            ["session_id"],
            ["id"],
        )
        batch_op.create_index(op.f("ix_quiz_attempts_session_id"), ["session_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("quiz_attempts") as batch_op:
        batch_op.drop_index(op.f("ix_quiz_attempts_session_id"))
        batch_op.drop_constraint("fk_quiz_attempts_session_id_quiz_sessions", type_="foreignkey")
        batch_op.drop_column("session_id")

    op.drop_index(op.f("ix_quiz_sessions_teacher_id"), table_name="quiz_sessions")
    op.drop_index(op.f("ix_quiz_sessions_quiz_id"), table_name="quiz_sessions")
    op.drop_index(op.f("ix_quiz_sessions_code"), table_name="quiz_sessions")
    op.drop_table("quiz_sessions")
