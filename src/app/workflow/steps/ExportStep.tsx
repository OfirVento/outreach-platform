'use client';

import { useState } from 'react';
import { useNewWorkflowStore } from '../../../store/newWorkflowStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { initializeGoogleAuth, appendToSheet } from '../../../lib/googleSheets';
import type { ExportRow } from '../../../types';
import {
    FileSpreadsheet,
    Download,
    ExternalLink,
    Copy,
    Check,
    Linkedin,
    Mail,
    Star,
    Clock,
    CheckCircle,
    Table,
    Loader2
} from 'lucide-react';

export default function ExportStep() {
    const { currentRun, generateExportRows, markExported, updateStepStatus } = useNewWorkflowStore();
    const { integrations } = useSettingsStore();
    const [isExporting, setIsExporting] = useState(false);
    const [exportComplete, setExportComplete] = useState(false);
    const [copiedRow, setCopiedRow] = useState<number | null>(null);
    const [sheetError, setSheetError] = useState<string | null>(null);

    const rows = currentRun?.exportData.rows || [];
    const exportedAt = currentRun?.exportData.exportedAt;

    // Use configured spreadsheet ID if available
    const spreadsheetId = integrations.googleSheets.enabled ? integrations.googleSheets.spreadsheetId : '';

    const handleGenerateExport = async () => {
        setIsExporting(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        generateExportRows();
        updateStepStatus('export', 'completed');
        setIsExporting(false);
    };

    const getFormattedRows = () => {
        // Headers matching the SDR Action Sheet schema
        const headers = [
            'Status', 'Priority', 'Sequence Step', 'Channel', 'Contact Name', 'Contact Title',
            'Company', 'LinkedIn URL', 'Email', 'Job Title Hiring', 'Tech Stack',
            'Message', 'Personalization Notes', 'Job Post URL', 'Suggested Send Date',
            'Sent Date', 'Response', 'Notes'
        ];

        const dataRows = rows.map(row => [
            row.status,
            row.priority,
            row.sequenceStep,
            row.channel,
            row.contactName,
            row.contactTitle,
            row.company,
            row.linkedInUrl,
            row.email,
            row.jobTitle,
            row.techStack,
            row.message, // No need to escape quotes for API
            row.personalizationNotes,
            row.jobPostUrl,
            row.suggestedSendDate,
            row.sentDate || '',
            row.response || '',
            row.notes || ''
        ]);

        return { headers, dataRows };
    };

    const handleExportToSheets = async () => {
        if (!integrations.googleSheets.clientId) {
            setSheetError("Missing Google Client ID. Please configure it in Settings.");
            return;
        }
        if (!spreadsheetId) {
            setSheetError("Missing Spreadsheet ID. Please configure it in Settings.");
            return;
        }

        setIsExporting(true);
        setSheetError(null);

        try {
            await initializeGoogleAuth(integrations.googleSheets.clientId);
            const { headers, dataRows } = getFormattedRows();

            // Append header if empty (logic could be improved but simple append is safe)
            // For now, we just append rows. User should set up headers once.
            // Actually, let's append headers only if we think it's fresh? No, safer to just append data.
            // Or maybe the user WANTS headers every time? Let's stick to data for now to avoid mess.

            await appendToSheet(spreadsheetId, 'Sheet1!A1', dataRows);

            markExported();
            setExportComplete(true);
        } catch (err: any) {
            console.error(err);
            setSheetError(err.message || "Failed to export to Google Sheets");
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownloadCSV = () => {
        if (rows.length === 0) return;
        const { headers, dataRows } = getFormattedRows();

        // Escape for CSV
        const csvRows = dataRows.map(row => row.map(cell => {
            const stringCell = String(cell);
            if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
                return `"${stringCell.replace(/"/g, '""')}"`;
            }
            return stringCell;
        }));

        const csvContent = [
            headers.join(','),
            ...csvRows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `outreach_campaign_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        markExported();
        setExportComplete(true);
    };

    const handleCopyRow = (index: number) => {
        const row = rows[index];
        const text = `${row.contactName} | ${row.company} | ${row.linkedInUrl || row.email}\n\n${row.message}`;
        navigator.clipboard.writeText(text);
        setCopiedRow(index);
        setTimeout(() => setCopiedRow(null), 2000);
    };

    const handleCopyAllMessages = () => {
        const allMessages = rows.map(row =>
            `--- ${row.contactName} (${row.company}) ---\n${row.message}\n`
        ).join('\n');
        navigator.clipboard.writeText(allMessages);
    };

    // Group by contact for summary
    const contactCount = new Set(rows.map(r => r.contactName)).size;
    const linkedInRows = rows.filter(r => r.channel === 'LinkedIn' || r.channel === 'LI+Email');
    const emailRows = rows.filter(r => r.channel === 'Email' || r.channel === 'LI+Email');

    return (
        <div className="space-y-6">
            {/* Export Panel */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        Export SDR Action Sheet
                    </h2>

                    <div className="flex items-center gap-2">
                        {rows.length === 0 && (
                            <button
                                onClick={handleGenerateExport}
                                disabled={isExporting}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isExporting
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                            >
                                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Table className="w-4 h-4" />}
                                {isExporting ? 'Generating...' : 'Generate Table'}
                            </button>
                        )}
                        {rows.length > 0 && (
                            <div className="flex gap-2">
                                {integrations.googleSheets.enabled ? (
                                    <button
                                        onClick={handleExportToSheets}
                                        disabled={isExporting}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                                        {isExporting ? 'Exporting...' : 'Update Google Sheet'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleDownloadCSV}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download CSV
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                    {integrations.googleSheets.enabled
                        ? "Export directly to your configured Google Sheet. Ensure you have added the Client ID and Spreadsheet ID in Settings."
                        : "Generate a CSV file formatted for your SDR team. Each row contains everything needed to send a message."}
                </p>

                {/* Stats */}
                {rows.length > 0 && (
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-gray-900">{contactCount}</p>
                            <p className="text-sm text-gray-500">Contacts</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-blue-600">{rows.length}</p>
                            <p className="text-sm text-gray-500">Total Messages</p>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-indigo-600">{linkedInRows.length}</p>
                            <p className="text-sm text-gray-500">LinkedIn</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-purple-600">{emailRows.length}</p>
                            <p className="text-sm text-gray-500">Email</p>
                        </div>
                    </div>
                )}

                {sheetError && (
                    <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg text-sm">
                        <span className="font-bold">Error:</span> {sheetError}
                    </div>
                )}

                {exportComplete && (
                    <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-lg">
                        <CheckCircle className="w-5 h-5" />
                        {integrations.googleSheets.enabled
                            ? "Google Sheet updated successfully!"
                            : "CSV downloaded successfully!"}
                    </div>
                )}
            </div>

            {/* Preview Table */}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900">
                        Preview ({rows.length} rows)
                    </h2>
                    <button
                        onClick={handleCopyAllMessages}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                        <Copy className="w-4 h-4" />
                        Copy All Messages
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Priority</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Step</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Company</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Links</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Job</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Send Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-16 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FileSpreadsheet className="w-12 h-12 text-gray-200 mb-4" />
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Populate</h3>
                                            <p className="max-w-md mx-auto mb-6 text-gray-500">
                                                Click Generate Table to fill this preview with your campaign data.
                                            </p>
                                            <button
                                                onClick={handleGenerateExport}
                                                disabled={isExporting}
                                                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${isExporting
                                                    ? 'bg-blue-100 text-blue-600'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                                    }`}
                                            >
                                                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Table className="w-4 h-4" />}
                                                {isExporting ? 'Generating...' : 'Generate Table'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.slice(0, 20).map((row, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <span className="text-lg">{row.status.split(' ')[0]}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 ${row.priority.includes('High') ? 'text-amber-600' : 'text-gray-500'
                                                }`}>
                                                {row.priority.includes('High') && <Star className="w-3 h-3 fill-current" />}
                                                {row.priority.replace('⭐ ', '')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${row.sequenceStep === '1st Touch'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {row.sequenceStep}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{row.contactName}</div>
                                            <div className="text-xs text-gray-500">{row.contactTitle}</div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{row.company}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {row.linkedInUrl && (
                                                    <a
                                                        href={row.linkedInUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                                                        title="Open LinkedIn"
                                                    >
                                                        <Linkedin className="w-4 h-4" />
                                                    </a>
                                                )}
                                                {row.email && (
                                                    <a
                                                        href={`mailto:${row.email}`}
                                                        className="p-1.5 bg-purple-100 text-purple-600 rounded hover:bg-purple-200 transition-colors"
                                                        title={row.email}
                                                    >
                                                        <Mail className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-gray-700 text-xs max-w-[150px] truncate" title={row.jobTitle}>
                                                {row.jobTitle}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="flex items-center gap-1 text-gray-500 text-xs">
                                                <Clock className="w-3 h-3" />
                                                {row.suggestedSendDate}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleCopyRow(index)}
                                                className={`p-1.5 rounded transition-colors ${copiedRow === index
                                                    ? 'bg-green-100 text-green-600'
                                                    : 'hover:bg-gray-100 text-gray-500'
                                                    }`}
                                                title="Copy contact info + message"
                                            >
                                                {copiedRow === index ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {rows.length > 20 && (
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center text-sm text-gray-500">
                        Showing 20 of {rows.length} rows. Download CSV to see all.
                    </div>
                )}
            </div>


            {/* Message Preview */}
            {rows.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Sample Message Preview</h2>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900">{rows[0].contactName}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500">{rows[0].company}</span>
                        </div>
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                            {rows[0].message}
                        </pre>
                    </div>
                </div>
            )}


        </div>
    );
}
