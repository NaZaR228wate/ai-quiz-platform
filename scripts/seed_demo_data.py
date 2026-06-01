from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_ROOT))

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.modules.attempts.models import QuizAttempt, QuizAttemptAnswer
from app.modules.courses.models import Course
from app.modules.materials.models import Material
from app.modules.quizzes.models import Quiz, QuizOption, QuizQuestion
from app.modules.sessions.models import QuizSession
from app.modules.topics.models import Topic
from app.modules.users.models import User


DEMO_PASSWORD = "12345678"
TEACHER_EMAIL = "teacher@example.com"
STUDENT_EMAILS = [
    "student@example.com",
    "anna.student@example.com",
    "mark.student@example.com",
    "sofia.student@example.com",
    "danylo.student@example.com",
    "olena.student@example.com",
]


@dataclass(frozen=True)
class QuestionSeed:
    text: str
    correct: str
    wrong: tuple[str, str]


@dataclass(frozen=True)
class QuizSeed:
    title: str
    description: str
    topic: str
    questions: list[QuestionSeed]


COURSES = {
    "Math Grade 10": {
        "description": "Algebra, functions and geometry for Grade 10 students.",
        "topics": {
            "Linear Equations": {
                "description": "Solving linear equations and interpreting simple algebraic models.",
                "material": (
                    "Linear equations describe relationships where the variable has power 1. "
                    "Students learn to isolate the variable by moving constants, combining like terms, "
                    "and dividing by the coefficient. Example: 2x + 3 = 7 gives x = 2."
                ),
            },
            "Quadratic Equations": {
                "description": "Introduction to quadratic equations, factoring and graph shape.",
                "material": (
                    "Quadratic equations include a squared variable and often have two solutions. "
                    "Students compare factoring, completing the square and the quadratic formula. "
                    "The graph of a quadratic function is a parabola."
                ),
            },
            "Functions": {
                "description": "Function notation, inputs, outputs and graph interpretation.",
                "material": (
                    "A function maps each input to exactly one output. Students use notation such as f(x), "
                    "read values from graphs, identify domain and range, and compare linear and nonlinear patterns."
                ),
            },
            "Geometry": {
                "description": "Angles, triangles, coordinate geometry and area formulas.",
                "material": (
                    "Geometry studies shapes, measurements and spatial relationships. Students calculate perimeter, "
                    "area and angles, use triangle properties, and apply coordinate geometry to solve practical problems."
                ),
            },
        },
    },
    "Physics Grade 10": {
        "description": "Core mechanics and electricity concepts for Grade 10 physics.",
        "topics": {
            "Mechanics": {
                "description": "Motion, forces, acceleration and Newton's laws.",
                "material": (
                    "Mechanics explains how objects move and why their motion changes. Students analyze speed, "
                    "velocity, acceleration, force and mass. Newton's laws connect forces with changes in motion."
                ),
            },
            "Electricity": {
                "description": "Electric circuits, current, voltage and resistance.",
                "material": (
                    "Electricity topics include current, voltage, resistance and simple circuits. Students apply "
                    "Ohm's law, V = IR, and compare series and parallel connections in household and lab examples."
                ),
            },
        },
    },
    "Biology Grade 10": {
        "description": "Cell structure, heredity and genetics for Grade 10 biology.",
        "topics": {
            "Cell Biology": {
                "description": "Cell organelles, membranes and basic cellular processes.",
                "material": (
                    "Cell biology focuses on the structure and function of cells. Students identify organelles, "
                    "describe the cell membrane, compare plant and animal cells, and explain how cells obtain energy."
                ),
            },
            "Genetics": {
                "description": "DNA, genes, inheritance patterns and Punnett squares.",
                "material": (
                    "Genetics explains how traits are passed from parents to offspring. Students study DNA, genes, "
                    "alleles, dominant and recessive traits, and use Punnett squares to predict inheritance outcomes."
                ),
            },
        },
    },
}


QUIZZES = [
    QuizSeed(
        "Linear Equations Basics",
        "Practice quiz on solving one-step and two-step linear equations.",
        "Linear Equations",
        [
            QuestionSeed("What is the solution of 2x + 3 = 7?", "x = 2", ("x = 1", "x = 5")),
            QuestionSeed("Which operation isolates x in x - 4 = 9?", "Add 4 to both sides", ("Subtract 4", "Multiply by 4")),
            QuestionSeed("What is the coefficient of x in 5x - 2 = 13?", "5", ("2", "13")),
            QuestionSeed("If 3x = 18, what is x?", "6", ("3", "15")),
            QuestionSeed("A linear equation has the variable raised to which power?", "1", ("2", "0")),
        ],
    ),
    QuizSeed(
        "Linear Equations Word Problems",
        "Realistic word problems that translate to linear equations.",
        "Linear Equations",
        [
            QuestionSeed("A number plus 8 equals 20. What is the number?", "12", ("8", "28")),
            QuestionSeed("If 4 tickets cost 40 dollars, what is the price of one ticket?", "10 dollars", ("4 dollars", "40 dollars")),
            QuestionSeed("Which equation models 'twice a number is 16'?", "2x = 16", ("x + 2 = 16", "x / 2 = 16")),
            QuestionSeed("A student has 15 points after gaining 6 points. What was the starting score?", "9", ("21", "6")),
            QuestionSeed("Which step is first in solving 5x + 10 = 35?", "Subtract 10 from both sides", ("Divide by 10", "Add 35")),
        ],
    ),
    QuizSeed(
        "Quadratic Equations",
        "Check understanding of quadratic expressions, roots and parabolas.",
        "Quadratic Equations",
        [
            QuestionSeed("What is the highest power in a quadratic equation?", "2", ("1", "3")),
            QuestionSeed("What shape is the graph of y = x^2?", "Parabola", ("Line", "Circle")),
            QuestionSeed("How many real roots can a quadratic equation have?", "0, 1 or 2", ("Only 1", "Always 2")),
            QuestionSeed("Which expression is quadratic?", "x^2 + 3x + 2", ("3x + 2", "x^3 + 1")),
            QuestionSeed("What are the roots of x^2 - 4 = 0?", "-2 and 2", ("0 and 4", "1 and 4")),
        ],
    ),
    QuizSeed(
        "Quadratic Functions Graphs",
        "Interpret vertex, direction and intercepts of quadratic graphs.",
        "Quadratic Equations",
        [
            QuestionSeed("The vertex of a parabola is its...", "turning point", ("slope", "radius")),
            QuestionSeed("If a > 0 in y = ax^2, the parabola opens...", "upward", ("downward", "sideways")),
            QuestionSeed("The y-intercept is found when...", "x = 0", ("y = 0", "x = 1")),
            QuestionSeed("The roots of a quadratic graph are where it crosses the...", "x-axis", ("y-axis", "origin only")),
            QuestionSeed("A negative discriminant means...", "no real roots", ("two real roots", "one repeated root")),
        ],
    ),
    QuizSeed(
        "Functions and Graphs",
        "Function notation, graph reading and input-output relationships.",
        "Functions",
        [
            QuestionSeed("A function assigns each input...", "exactly one output", ("two outputs", "no output")),
            QuestionSeed("In f(3) = 9, what is the input?", "3", ("9", "f")),
            QuestionSeed("The set of all possible input values is the...", "domain", ("range", "slope")),
            QuestionSeed("The set of output values is the...", "range", ("domain", "axis")),
            QuestionSeed("A vertical line test checks whether a graph is a...", "function", ("triangle", "quadratic formula")),
        ],
    ),
    QuizSeed(
        "Geometry Basics",
        "Angles, triangles and area formulas.",
        "Geometry",
        [
            QuestionSeed("The sum of angles in a triangle is...", "180 degrees", ("90 degrees", "360 degrees")),
            QuestionSeed("Area of a rectangle is...", "length times width", ("length plus width", "perimeter divided by 2")),
            QuestionSeed("A right angle measures...", "90 degrees", ("45 degrees", "180 degrees")),
            QuestionSeed("Perimeter measures...", "distance around a shape", ("space inside a shape", "height only")),
            QuestionSeed("Parallel lines...", "never meet", ("always cross", "form a circle")),
        ],
    ),
    QuizSeed(
        "Mechanics Fundamentals",
        "Motion, forces and Newton's laws.",
        "Mechanics",
        [
            QuestionSeed("Speed is distance divided by...", "time", ("mass", "force")),
            QuestionSeed("Acceleration is a change in...", "velocity", ("temperature", "volume")),
            QuestionSeed("Force is measured in...", "newtons", ("watts", "volts")),
            QuestionSeed("Newton's first law is about...", "inertia", ("electricity", "genetics")),
            QuestionSeed("If net force increases, acceleration usually...", "increases", ("decreases to zero", "stays impossible")),
        ],
    ),
    QuizSeed(
        "Electric Circuits",
        "Current, voltage, resistance and simple circuits.",
        "Electricity",
        [
            QuestionSeed("Ohm's law is...", "V = IR", ("F = ma", "E = mc^2")),
            QuestionSeed("Current is measured in...", "amperes", ("ohms", "joules")),
            QuestionSeed("Resistance is measured in...", "ohms", ("volts", "meters")),
            QuestionSeed("A closed circuit allows current to...", "flow", ("stop", "disappear")),
            QuestionSeed("In a series circuit, components share the same...", "current", ("DNA", "area")),
        ],
    ),
    QuizSeed(
        "Cell Biology",
        "Cell structures and functions.",
        "Cell Biology",
        [
            QuestionSeed("The nucleus contains...", "genetic material", ("cell wall only", "water only")),
            QuestionSeed("Mitochondria produce...", "energy", ("light", "bones")),
            QuestionSeed("Plant cells have a...", "cell wall", ("nervous system", "battery")),
            QuestionSeed("The cell membrane controls...", "what enters and leaves", ("gravity", "voltage")),
            QuestionSeed("Ribosomes help make...", "proteins", ("circuits", "triangles")),
        ],
    ),
    QuizSeed(
        "Genetics and Inheritance",
        "Genes, alleles and inheritance patterns.",
        "Genetics",
        [
            QuestionSeed("DNA carries...", "genetic information", ("electric current", "mechanical force")),
            QuestionSeed("An allele is a version of a...", "gene", ("cell membrane", "triangle")),
            QuestionSeed("Dominant traits can appear with...", "one dominant allele", ("no alleles", "only two recessive alleles")),
            QuestionSeed("Punnett squares are used to predict...", "inheritance outcomes", ("speed", "voltage")),
            QuestionSeed("Genotype describes...", "genetic makeup", ("visible only traits", "cell size only")),
        ],
    ),
]


def main() -> None:
    with SessionLocal() as db:
        teacher = ensure_user(db, TEACHER_EMAIL, "Teacher One", "teacher")
        reset_demo_content(db, teacher)

        students = [
            ensure_user(db, email, name, "student")
            for email, name in zip(
                STUDENT_EMAILS,
                ["Student One", "Anna Kovalenko", "Mark Petrenko", "Sofia Melnyk", "Danylo Bondar", "Olena Shevchenko"],
                strict=True,
            )
        ]

        topics_by_title = seed_courses_topics_materials(db, teacher)
        quizzes_by_title = seed_quizzes(db, topics_by_title)
        seed_sessions_and_attempts(db, teacher, students, quizzes_by_title)

        db.commit()

    print("Demo data seeded successfully.")
    print("Teacher: teacher@example.com / 12345678")
    print("Students: student@example.com, anna.student@example.com, mark.student@example.com / 12345678")


def ensure_user(db: Session, email: str, full_name: str, role: str) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, full_name=full_name, role=role, hashed_password=hash_password(DEMO_PASSWORD))
        db.add(user)
        db.flush()
        return user

    user.full_name = full_name
    user.role = role
    if not user.hashed_password:
        user.hashed_password = hash_password(DEMO_PASSWORD)
    return user


def reset_demo_content(db: Session, teacher: User) -> None:
    reset_titles = set(COURSES.keys()) | {"Linear equations", "string", "test", "sample", "topic1", "topic2"}
    course_ids = [
        row[0]
        for row in db.execute(
            select(Course.id).where(Course.teacher_id == teacher.id, Course.title.in_(sorted(reset_titles)))
        )
    ]
    if not course_ids:
        return

    topic_ids = [row[0] for row in db.execute(select(Topic.id).where(Topic.course_id.in_(course_ids)))]
    quiz_ids = [row[0] for row in db.execute(select(Quiz.id).where(Quiz.topic_id.in_(topic_ids)))] if topic_ids else []
    question_ids = (
        [row[0] for row in db.execute(select(QuizQuestion.id).where(QuizQuestion.quiz_id.in_(quiz_ids)))]
        if quiz_ids
        else []
    )
    session_ids = (
        [row[0] for row in db.execute(select(QuizSession.id).where(QuizSession.quiz_id.in_(quiz_ids)))]
        if quiz_ids
        else []
    )
    attempt_ids = []
    if quiz_ids:
        attempt_ids.extend(row[0] for row in db.execute(select(QuizAttempt.id).where(QuizAttempt.quiz_id.in_(quiz_ids))))
    if session_ids:
        attempt_ids.extend(
            row[0] for row in db.execute(select(QuizAttempt.id).where(QuizAttempt.session_id.in_(session_ids)))
        )
    attempt_ids = sorted(set(attempt_ids))

    if attempt_ids:
        db.execute(delete(QuizAttemptAnswer).where(QuizAttemptAnswer.attempt_id.in_(attempt_ids)))
        db.execute(delete(QuizAttempt).where(QuizAttempt.id.in_(attempt_ids)))
    if session_ids:
        db.execute(delete(QuizSession).where(QuizSession.id.in_(session_ids)))
    if question_ids:
        db.execute(delete(QuizOption).where(QuizOption.question_id.in_(question_ids)))
        db.execute(delete(QuizQuestion).where(QuizQuestion.id.in_(question_ids)))
    if quiz_ids:
        db.execute(delete(Quiz).where(Quiz.id.in_(quiz_ids)))
    if topic_ids:
        db.execute(delete(Material).where(Material.topic_id.in_(topic_ids)))
        db.execute(delete(Topic).where(Topic.id.in_(topic_ids)))
    db.execute(delete(Course).where(Course.id.in_(course_ids)))
    db.flush()


def seed_courses_topics_materials(db: Session, teacher: User) -> dict[str, Topic]:
    topics_by_title: dict[str, Topic] = {}

    for course_title, course_data in COURSES.items():
        course = db.scalar(select(Course).where(Course.teacher_id == teacher.id, Course.title == course_title))
        if course is None:
            course = Course(teacher_id=teacher.id, title=course_title)
            db.add(course)
            db.flush()

        course.description = course_data["description"]

        for topic_title, topic_data in course_data["topics"].items():
            topic = db.scalar(select(Topic).where(Topic.course_id == course.id, Topic.title == topic_title))
            if topic is None:
                topic = Topic(course_id=course.id, title=topic_title)
                db.add(topic)
                db.flush()

            topic.description = topic_data["description"]
            topics_by_title[topic_title] = topic

            material_title = f"Lesson: {topic_title}"
            material = db.scalar(select(Material).where(Material.topic_id == topic.id, Material.title == material_title))
            if material is None:
                material = Material(topic_id=topic.id, title=material_title, content_text=topic_data["material"])
                db.add(material)
            else:
                material.content_text = topic_data["material"]

    return topics_by_title


def seed_quizzes(db: Session, topics_by_title: dict[str, Topic]) -> dict[str, Quiz]:
    quizzes_by_title: dict[str, Quiz] = {}

    for quiz_seed in QUIZZES:
        topic = topics_by_title[quiz_seed.topic]
        quiz = db.scalar(select(Quiz).where(Quiz.topic_id == topic.id, Quiz.title == quiz_seed.title))
        if quiz is None:
            quiz = Quiz(topic_id=topic.id, title=quiz_seed.title)
            db.add(quiz)
            db.flush()

        quiz.description = quiz_seed.description
        reset_quiz_questions(db, quiz, quiz_seed.questions)
        quizzes_by_title[quiz.title] = quiz

    return quizzes_by_title


def reset_quiz_questions(db: Session, quiz: Quiz, questions: list[QuestionSeed]) -> None:
    existing_question_ids = [row[0] for row in db.execute(select(QuizQuestion.id).where(QuizQuestion.quiz_id == quiz.id))]
    if existing_question_ids:
        attempt_ids = [row[0] for row in db.execute(select(QuizAttempt.id).where(QuizAttempt.quiz_id == quiz.id))]
        if attempt_ids:
            db.execute(delete(QuizAttemptAnswer).where(QuizAttemptAnswer.attempt_id.in_(attempt_ids)))
            db.execute(delete(QuizAttempt).where(QuizAttempt.id.in_(attempt_ids)))
        db.execute(delete(QuizOption).where(QuizOption.question_id.in_(existing_question_ids)))
        db.execute(delete(QuizQuestion).where(QuizQuestion.id.in_(existing_question_ids)))
        db.flush()

    for question_seed in questions:
        question = QuizQuestion(quiz_id=quiz.id, question_text=question_seed.text, question_type="single_choice")
        db.add(question)
        db.flush()
        db.add_all(
            [
                QuizOption(question_id=question.id, option_text=question_seed.correct, is_correct=True),
                QuizOption(question_id=question.id, option_text=question_seed.wrong[0], is_correct=False),
                QuizOption(question_id=question.id, option_text=question_seed.wrong[1], is_correct=False),
            ]
        )


def seed_sessions_and_attempts(db: Session, teacher: User, students: list[User], quizzes_by_title: dict[str, Quiz]) -> None:
    session_plan = [
        ("Linear Equations Basics", "MATH10", "active", 0, [5, 4, 4, 3, 5]),
        ("Quadratic Equations", "QUAD10", "active", 0, [4, 3, 5, 2]),
        ("Functions and Graphs", "FUNC10", "closed", 2, [5, 4, 3, 4, 5, 2]),
        ("Mechanics Fundamentals", "PHYS10", "closed", 4, [3, 4, 4, 5]),
        ("Cell Biology", "BIO10", "closed", 5, [4, 5, 3, 4]),
    ]

    for quiz_title, code, status, days_ago, scores in session_plan:
        quiz = quizzes_by_title[quiz_title]
        session = db.scalar(select(QuizSession).where(QuizSession.code == code))
        if session is None:
            session = QuizSession(quiz_id=quiz.id, teacher_id=teacher.id, code=code)
            db.add(session)
            db.flush()

        session.quiz_id = quiz.id
        session.teacher_id = teacher.id
        session.status = status
        session.created_at = datetime.now(timezone.utc) - timedelta(days=days_ago, hours=2)
        session.closed_at = None if status == "active" else datetime.now(timezone.utc) - timedelta(days=days_ago, hours=1)

        clear_session_attempts(db, session.id)
        for index, score in enumerate(scores):
            create_attempt(db, quiz.id, session.id, students[index % len(students)].id, score)


def clear_session_attempts(db: Session, session_id: int) -> None:
    attempt_ids = [row[0] for row in db.execute(select(QuizAttempt.id).where(QuizAttempt.session_id == session_id))]
    if not attempt_ids:
        return

    db.execute(delete(QuizAttemptAnswer).where(QuizAttemptAnswer.attempt_id.in_(attempt_ids)))
    db.execute(delete(QuizAttempt).where(QuizAttempt.id.in_(attempt_ids)))
    db.flush()


def create_attempt(db: Session, quiz_id: int, session_id: int, student_id: int, target_score: int) -> None:
    questions = list(db.scalars(select(QuizQuestion).where(QuizQuestion.quiz_id == quiz_id).order_by(QuizQuestion.id)))
    total_questions = len(questions)
    score = max(0, min(target_score, total_questions))
    attempt = QuizAttempt(
        quiz_id=quiz_id,
        session_id=session_id,
        student_id=student_id,
        score=score,
        total_questions=total_questions,
        created_at=datetime.now(timezone.utc) - timedelta(minutes=student_id * 7),
    )
    db.add(attempt)
    db.flush()

    for index, question in enumerate(questions):
        options = list(db.scalars(select(QuizOption).where(QuizOption.question_id == question.id).order_by(QuizOption.id)))
        correct_option = next(option for option in options if option.is_correct)
        wrong_option = next(option for option in options if not option.is_correct)
        is_correct = index < score
        selected_option = correct_option if is_correct else wrong_option
        db.add(
            QuizAttemptAnswer(
                attempt_id=attempt.id,
                question_id=question.id,
                selected_option_id=selected_option.id,
                is_correct=is_correct,
            )
        )


if __name__ == "__main__":
    main()
