import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Sparkles,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Installment, SchoolProfile, Student, StudentFeeStructure } from '../types';
import { formatCurrency } from '../utils/numberToWords';
import { lookupStandardClassFee } from '../data/trialSpreadsheetData';
import { generateInstallments } from '../utils/feeCalculator';

interface BulkUploadModalProps {
  onClose: () => void;
  onImportStudents: (
    newStudents: Student[],
    newStructures: StudentFeeStructure[],
    newInstallments: Installment[]
  ) => void;
  existingStudents: Student[];
  schoolProfile: SchoolProfile;
}

interface ParsedStudentRow {
  rollNo: string;
  name: string;
  className: string;
  section: string;
  parentName: string;
  phone: string;
  concession: number;
  isActive: boolean;
  isValid: boolean;
  validationError?: string;
  isDuplicate?: boolean;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  onClose,
  onImportStudents,
  existingStudents,
  classMasters = {},
  schoolProfile,
}) => {
  const currencySymbol = schoolProfile?.currencySymbol || '₹';
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [csvText, setCsvText] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sample CSV Template Download
  const handleDownloadSampleCsv = () => {
    const headers = 'RollNo,Name,Class,Section,ParentName,Phone,Concession,Active';
    const sampleData = [
      '101,Aarav Sharma,Class 1,A,Rajesh Sharma,9876543210,0,TRUE',
      '102,Diya Patel,Class 1,A,Suresh Patel,9823456789,2000,TRUE',
      '103,Rohan Verma,Class 2,B,Anil Verma,9811223344,0,TRUE',
      '104,Ananya Gupta,Class 3,A,Vikas Gupta,9877665544,1500,TRUE',
      '105,Kabir Singh,Class 4,C,Harpreet Singh,9899001122,0,TRUE',
    ].join('\n');

    const csvContent = `${headers}\n${sampleData}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'student_bulk_upload_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV text string (handles comma, tab, semicolon delimiters)
  const parseCsvContent = (text: string) => {
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setParsedRows([]);
      return;
    }

    // Determine delimiter (comma, tab, or semicolon)
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

    const headerParts = firstLine.split(delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
    
    // Check if first line is a header
    const isHeaderPresent =
      headerParts.includes('name') ||
      headerParts.includes('rollno') ||
      headerParts.includes('roll') ||
      headerParts.includes('class');

    const dataLines = isHeaderPresent ? lines.slice(1) : lines;

    const existingRollNos = new Set(existingStudents.map((s) => s.rollNo.toLowerCase().trim()));
    const seenRollNosInBatch = new Set<string>();

    const rows: ParsedStudentRow[] = dataLines.map((line, idx) => {
      const parts = line.split(delimiter).map((p) => p.replace(/^["']|["']$/g, '').trim());
      
      let rollNo = '';
      let name = '';
      let className = '';
      let section = 'A';
      let parentName = '';
      let phone = '';
      let concession = 0;
      let isActive = true;

      if (isHeaderPresent) {
        // Map by header index
        headerParts.forEach((header, colIdx) => {
          const val = parts[colIdx] || '';
          if (header.includes('roll')) rollNo = val;
          else if (header === 'name' || header.includes('student')) name = val;
          else if (header === 'class' || header.includes('grade')) className = val;
          else if (header === 'sec' || header.includes('section')) section = val || 'A';
          else if (header.includes('parent') || header.includes('father') || header.includes('guardian')) parentName = val;
          else if (header.includes('phone') || header.includes('mobile') || header.includes('contact')) phone = val;
          else if (header.includes('concession') || header.includes('discount') || header.includes('scholarship')) concession = Number(val) || 0;
          else if (header.includes('active') || header.includes('status')) isActive = val.toLowerCase() !== 'false' && val.toLowerCase() !== 'inactive' && val !== '0';
        });
      } else {
        // Positional fallback: RollNo, Name, Class, Section, ParentName, Phone, Concession, Active
        rollNo = parts[0] || `TEMP-${idx + 1}`;
        name = parts[1] || '';
        className = parts[2] || 'Class 1';
        section = parts[3] || 'A';
        parentName = parts[4] || '';
        phone = parts[5] || '';
        concession = Number(parts[6]) || 0;
        isActive = parts[7] ? parts[7].toLowerCase() !== 'false' && parts[7] !== '0' : true;
      }

      // Normalization
      if (className && !className.toLowerCase().startsWith('class')) {
        // e.g. "1" -> "Class 1", "UKG" -> "Class UKG"
        className = `Class ${className}`;
      }

      // Validation
      let isValid = true;
      let validationError = '';
      let isDuplicate = false;

      if (!name) {
        isValid = false;
        validationError = 'Student Name is required';
      } else if (!rollNo) {
        isValid = false;
        validationError = 'Roll Number is required';
      } else if (existingRollNos.has(rollNo.toLowerCase().trim())) {
        isDuplicate = true;
        validationError = 'Roll No already exists in school records';
      } else if (seenRollNosInBatch.has(rollNo.toLowerCase().trim())) {
        isDuplicate = true;
        validationError = 'Duplicate Roll No in this CSV file';
      } else {
        seenRollNosInBatch.add(rollNo.toLowerCase().trim());
      }

      return {
        rollNo: rollNo || `S-${idx + 1}`,
        name: name || 'Unnamed Student',
        className: className || 'Class 1',
        section: section || 'A',
        parentName: parentName || '',
        phone: phone || '',
        concession: Math.max(0, concession),
        isActive,
        isValid: isValid && !isDuplicate,
        validationError,
        isDuplicate,
      };
    });

    setParsedRows(rows);
  };

  // Handle File Input Selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      parseCsvContent(content);
    };
    reader.readAsText(file);
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setCsvText(content);
        parseCsvContent(content);
      };
      reader.readAsText(file);
    }
  };

  // Execute Bulk Import
  const handleCommitImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('No valid student rows to import. Please check validation errors in the preview.');
      return;
    }

    setIsProcessing(true);

    const newStudents: Student[] = [];
    const newStructures: StudentFeeStructure[] = [];
    const newInstallments: Installment[] = [];

    const nowIso = new Date().toISOString();

    validRows.forEach((row) => {
      const studentId = `std-bulk-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // 1. Create Student record
      const student: Student = {
        id: studentId,
        rollNo: row.rollNo,
        name: row.name,
        classId: row.className,
        className: row.className,
        section: row.section || 'A',
        parentName: row.parentName ? row.parentName.trim() : '',
        phone: row.phone || '',
        address: '',
        admissionDate: nowIso.split('T')[0],
        isActive: row.isActive,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      newStudents.push(student);

      // 2. Derive fee structure based on standard class fee
      const annualBaseFee = lookupStandardClassFee(row.className);
      const netCommittedFee = Math.max(0, annualBaseFee - row.concession);
      const structureId = `sfs-${studentId}`;

      const feeStructure: StudentFeeStructure = {
        id: structureId,
        studentId,
        headName: 'School Tuition Fee',
        actualFee: annualBaseFee,
        committedFee: netCommittedFee,
        concession: row.concession,
        commitmentDate: nowIso.split('T')[0],
        installmentsCount: 7,
        isSpotFee: false,
      };
      newStructures.push(feeStructure);

      // 3. Generate 7 Installments for School Tuition Fee
      const genInsts = generateInstallments(
        structureId,
        studentId,
        'School Tuition Fee',
        netCommittedFee,
        7,
        6, // July start
        10
      );
      newInstallments.push(...genInsts);
    });

    onImportStudents(newStudents, newStructures, newInstallments);
    setIsProcessing(false);
    setSuccessMsg(`Successfully imported ${validRows.length} students with fee structures and installments!`);
    
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div
      id="modal-bulk-upload-csv"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden my-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Bulk Upload Students via CSV / Excel
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Import large batches of students with automatic fee structure creation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              title="Download pre-formatted sample CSV template"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download Sample CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-800 dark:text-slate-200">
          
          {/* Success Banner */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-400 text-emerald-900 dark:text-emerald-200 rounded-xl flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Upload Drop Zone & Text Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Drag and Drop Box */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/40 transition-colors min-h-[160px]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 mb-2 border border-emerald-200 dark:border-emerald-800">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                Click to browse or drag & drop .CSV file here
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Supports Excel CSV, Google Sheets exported CSV, or Comma-separated files
              </p>
            </div>

            {/* Direct Paste Box */}
            <div className="flex flex-col justify-between">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Or Paste CSV / Tabular Text directly from Excel:
              </label>
              <textarea
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  parseCsvContent(e.target.value);
                }}
                placeholder="RollNo, Name, Class, Section, ParentName, Phone, Concession&#10;101, Aarav Sharma, Class 1, A, Rajesh Sharma, 9876543210, 0&#10;102, Diya Patel, Class 1, A, Suresh Patel, 9823456789, 2000"
                rows={5}
                className="w-full flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Validation & Status Header */}
          {parsedRows.length > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  Parsed Rows ({parsedRows.length}):
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                  ✓ {validCount} Valid & Ready
                </span>
                {invalidCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold text-[11px]">
                    ⚠ {invalidCount} Invalid / Duplicates (will be skipped)
                  </span>
                )}
              </div>

              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Review student records before importing:
              </span>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                  <tr>
                    <th className="py-2 px-2.5 w-10 text-center">#</th>
                    <th className="py-2 px-2.5">Roll No</th>
                    <th className="py-2 px-2.5">Student Name</th>
                    <th className="py-2 px-2.5">Class & Sec</th>
                    <th className="py-2 px-2.5">Parent Name</th>
                    <th className="py-2 px-2.5">Phone</th>
                    <th className="py-2 px-2.5 text-right">Concession</th>
                    <th className="py-2 px-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {parsedRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`${
                        row.isValid
                          ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          : 'bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300'
                      }`}
                    >
                      <td className="py-1.5 px-2.5 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-2.5 font-mono font-bold">
                        #{row.rollNo}
                      </td>
                      <td className="py-1.5 px-2.5 font-semibold text-slate-900 dark:text-slate-100">
                        {row.name}
                      </td>
                      <td className="py-1.5 px-2.5 font-medium">
                        {row.className} ({row.section})
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-600 dark:text-slate-400">
                        {row.parentName || '—'}
                      </td>
                      <td className="py-1.5 px-2.5 font-mono text-slate-600 dark:text-slate-400">
                        {row.phone || '—'}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {row.concession > 0 ? formatCurrency(row.concession, currencySymbol) : '—'}
                      </td>
                      <td className="py-1.5 px-2.5 text-center">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            ✓ Ready
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                            title={row.validationError}
                          >
                            ⚠ {row.validationError || 'Invalid'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCommitImport}
            disabled={validCount === 0 || isProcessing}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>
              {isProcessing ? 'Importing...' : `Import ${validCount} Student${validCount === 1 ? '' : 's'}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
