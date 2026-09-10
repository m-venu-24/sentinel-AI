import { LogEntry } from '../types';

/**
 * Convert array of LogEntry objects to CSV format
 * @param logs Array of log entries to export
 * @returns CSV formatted string
 */
export function convertLogsToCSV(logs: LogEntry[]): string {
  if (logs.length === 0) {
    return 'timestamp,station,region,anomaly_type,classification,confidence,action,ticket_status\n';
  }

  const headers = ['timestamp', 'station', 'region', 'anomaly_type', 'classification', 'confidence', 'action', 'ticket_status'];
  
  const csvRows = [
    headers.join(','),
    ...logs.map(log => {
      const values = [
        log.timestamp,
        log.station || log.stationName,
        log.region || '',
        log.anomalyType || '',
        log.kind,
        log.confidence,
        log.action,
        log.ticketStatus || ''
      ];
      
      // Escape values that contain commas, quotes, or newlines
      const escapedValues = values.map(value => {
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      
      return escapedValues.join(',');
    })
  ];

  return csvRows.join('\n');
}

/**
 * Trigger browser download of CSV file
 * @param csvContent CSV formatted string
 * @param filename Name for the downloaded file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Export log entries to CSV file with timestamped filename
 * @param logs Array of log entries to export
 */
export function exportLogsToCSV(logs: LogEntry[]): void {
  const csvContent = convertLogsToCSV(logs);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `aws-alert-logs-${timestamp}.csv`;
  downloadCSV(csvContent, filename);
}