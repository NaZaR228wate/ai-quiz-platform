"""create question bank

Revision ID: 0008_create_question_bank
Revises: 0007_create_quiz_sessions
Create Date: 2026-06-01 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "0008_create_question_bank"
down_revision: Union[str, Sequence[str], None] = "0007_create_quiz_sessions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "question_bank_questions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("question_type", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_question_bank_questions_teacher_id"),
        "question_bank_questions",
        ["teacher_id"],
        unique=False,
    )
    op.create_table(
        "question_bank_options",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("option_text", sa.Text(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), server_default="false", nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["question_bank_questions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_question_bank_options_question_id"),
        "question_bank_options",
        ["question_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_question_bank_options_question_id"), table_name="question_bank_options")
    op.drop_table("question_bank_options")
    op.drop_index(op.f("ix_question_bank_questions_teacher_id"), table_name="question_bank_questions")
    op.drop_table("question_bank_questions")
