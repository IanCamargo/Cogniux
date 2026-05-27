import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Exam, Student, Submission } from "@/types";

const ALPHABET = ["A", "B", "C", "D", "E"];

interface ExamPrintViewProps {
  exam: Exam;
  students: Student[];
  mode: "generic" | "students";
}

function PrintSheet({ exam, student }: { exam: Exam; student: Pick<Student, "id" | "name"> }) {
  const half = Math.ceil(exam.numQuestions / 2);
  return (
    <div style={{ pageBreakAfter: "always", padding: 48 }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid black", paddingBottom: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, textTransform: "uppercase", margin: 0 }}>Gabarito</h1>
          {student.name && <p style={{ marginTop: 16 }}><strong>ALUNO:</strong> {student.name}</p>}
          <p><strong>MATÉRIA:</strong> {exam.subject}</p>
        </div>
        <QRCodeSVG
          value={JSON.stringify({ examId: exam.id, studentName: student.name, num: exam.numQuestions })}
          size={100}
          fgColor="#000000"
          marginSize={2}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {[0, 1].map((col) => (
          <div key={col} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: col === 0 ? half : exam.numQuestions - half }).map((_, i) => {
              const qNum = col === 0 ? i + 1 : half + i + 1;
              return (
                <div key={qNum} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 24, textAlign: "right", fontWeight: 700 }}>{qNum}</span>
                  <div style={{ flex: 1, display: "flex", justifyContent: "space-between", border: "2px solid black", borderRadius: 9999, padding: "8px 16px" }}>
                    {ALPHABET.slice(0, exam.alternativesPerQuestion).map((l) => (
                      <div key={l} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #9ca3af", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 700 }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function PrintDocument({ exam, students, mode }: ExamPrintViewProps) {
  const list = mode === "students" && students.length > 0
    ? students
    : [{ id: "generic", name: "" } as Student];

  return (
    <div style={{ background: "white", color: "black", padding: 16 }}>
      {list.map((student) => (
        <PrintSheet key={student.id} exam={exam} student={student} />
      ))}
    </div>
  );
}

function SubmissionPrintDocument({ exam, submission }: { exam: Exam; submission: Submission }) {
  const half = Math.ceil(exam.numQuestions / 2);
  return (
    <div style={{ background: "white", color: "black", padding: 48 }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid black", paddingBottom: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, textTransform: "uppercase", margin: 0 }}>Gabarito</h1>
          <p style={{ marginTop: 16 }}><strong>ALUNO:</strong> {submission.studentName}</p>
          <p><strong>MATÉRIA:</strong> {exam.subject}</p>
          <p><strong>NOTA:</strong> {submission.score.toFixed(1)}</p>
        </div>
        <QRCodeSVG
          value={JSON.stringify({ examId: exam.id, studentName: submission.studentName })}
          size={100}
          fgColor="#000000"
          marginSize={2}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {[0, 1].map((col) => (
          <div key={col} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: col === 0 ? half : exam.numQuestions - half }).map((_, i) => {
              const qNum = col === 0 ? i + 1 : half + i + 1;
              const studentAnswer = submission.answers[qNum - 1];
              const correctAnswer = exam.answerKey[qNum - 1];
              return (
                <div key={qNum} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 24, textAlign: "right", fontWeight: 700 }}>{qNum}</span>
                  <div style={{ flex: 1, display: "flex", justifyContent: "space-between", border: "2px solid black", borderRadius: 9999, padding: "8px 16px" }}>
                    {ALPHABET.slice(0, exam.alternativesPerQuestion).map((l) => {
                      const isSelected = studentAnswer === l;
                      const isCorrect = correctAnswer === l;
                      const bg = isSelected
                        ? isCorrect ? "#16a34a" : "#dc2626"
                        : "transparent";
                      return (
                        <div key={l} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #9ca3af", display: "flex", alignItems: "center", justifyContent: "center", background: bg }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: isSelected ? "white" : "black" }}>{l}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function useSubmissionPrint(exam: Exam | null, submission: Submission | null) {
  const ref = useRef<HTMLDivElement>(null);
  const print = useReactToPrint({ contentRef: ref });
  const node = exam && submission ? (
    <div style={{ display: "none" }}>
      <div ref={ref}>
        <SubmissionPrintDocument exam={exam} submission={submission} />
      </div>
    </div>
  ) : null;
  return { print, node };
}

export function ExamPrintView({ exam, students }: { exam: Exam; students: Student[] }) {
  const genericRef = useRef<HTMLDivElement>(null);
  const studentsRef = useRef<HTMLDivElement>(null);

  const printGeneric = useReactToPrint({ contentRef: genericRef });
  const printStudents = useReactToPrint({ contentRef: studentsRef });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => printGeneric()}>
          <Printer size={14} /> Imprimir
        </Button>
        <Button size="sm" variant="outline" disabled={students.length === 0} onClick={() => printStudents()}>
          <Printer size={14} /> Imprimir por Aluno
        </Button>
      </div>

      <div style={{ display: "none" }}>
        <div ref={genericRef}>
          <PrintDocument exam={exam} students={students} mode="generic" />
        </div>
        <div ref={studentsRef}>
          <PrintDocument exam={exam} students={students} mode="students" />
        </div>
      </div>
    </div>
  );
}
