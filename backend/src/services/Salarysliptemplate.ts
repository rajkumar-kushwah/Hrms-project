// ─────────────────────────────────────────────────────────────
// Salary Slip HTML Template
// ─────────────────────────────────────────────────────────────
// Takes the payroll detail object (same shape returned by
// getEmployeePayrollDetail) + company info, and returns a
// complete HTML string ready to be rendered by Puppeteer.
// ─────────────────────────────────────────────────────────────

interface CompanyInfo {
    name: string;
    address?: string;
    logoUrl?: string; // must be a public URL or base64 data URI
}

interface SalarySlipData {
    user: {
        name: string | null;
        employeeCode: string | null;
        designation: string | null;
    };
    month: number;
    year: number;

    totalDaysInMonth: number;
    payableDays: number;

    grossSalary: number;
    earnedSalary: number;
    perDaySalary: number;

    presentDays: number;
    paidLeaveDays: number;
    unpaidLeaveDays: number;
    absentDays: number;
    holidayDays: number;
    // weekOffDays: number;

    totalUnpaidDays: number;
    deductionAmount: number;
    netSalary: number;
    status: string;
}

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const formatCurrency = (amount: number) => {
    return `₹ ${amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

export const generateSalarySlipHTML = (
    data: SalarySlipData,
    company: CompanyInfo
): string => {
    const monthLabel = `${MONTH_NAMES[data.month - 1]} ${data.year}`;

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
        font-family: "Helvetica Neue", Arial, sans-serif;
        color: #1a1a1a;
        padding: 40px;
        font-size: 12px;
    }
    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #111827;
        padding-bottom: 16px;
        margin-bottom: 20px;
    }
    .company-name { font-size: 20px; font-weight: 700; }
    .company-address { font-size: 11px; color: #555; margin-top: 2px; }
    .slip-title {
        text-align: right;
        font-size: 14px;
        font-weight: 600;
        color: #374151;
    }
    .slip-subtitle { text-align: right; font-size: 12px; color: #6b7280; }

    .employee-info {
        display: flex;
        justify-content: space-between;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 14px 18px;
        margin-bottom: 20px;
    }
    .info-block { line-height: 1.8; }
    .info-label { color: #6b7280; font-size: 10px; text-transform: uppercase; }
    .info-value { font-weight: 600; font-size: 12px; }

    .attendance-summary {
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px;
        gap: 10px;
    }
    .summary-card {
        flex: 1;
        text-align: center;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 10px 4px;
    }
    .summary-card .value { font-size: 15px; font-weight: 700; }
    .summary-card .label { font-size: 9px; color: #6b7280; text-transform: uppercase; margin-top: 2px; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th {
        text-align: left;
        background: #111827;
        color: #fff;
        padding: 8px 12px;
        font-size: 11px;
        text-transform: uppercase;
    }
    th.amount-col, td.amount-col { text-align: right; }
    td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 12px; }

    .net-pay-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #111827;
        color: #fff;
        padding: 14px 18px;
        border-radius: 6px;
        margin-top: 10px;
    }
    .net-pay-row .label { font-size: 13px; font-weight: 600; }
    .net-pay-row .value { font-size: 18px; font-weight: 700; }

    .footer {
        margin-top: 30px;
        font-size: 10px;
        color: #9ca3af;
        text-align: center;
        border-top: 1px solid #eee;
        padding-top: 10px;
    }
</style>
</head>
<body>

    <div class="header">
        <div>
            <div class="company-name">${company.name}</div>
            ${company.address ? `<div class="company-address">${company.address}</div>` : ""}
        </div>
        <div>
            <div class="slip-title">Salary Slip</div>
            <div class="slip-subtitle">${monthLabel}</div>
        </div>
    </div>

    <div class="employee-info">
        <div class="info-block">
            <div class="info-label">Employee Name</div>
            <div class="info-value">${data.user.name}</div>
        </div>
        <div class="info-block">
            <div class="info-label">Employee Code</div>
            <div class="info-value">${data.user.employeeCode ?? "-"}</div>
        </div>
        <div class="info-block">
            <div class="info-label">Designation</div>
            <div class="info-value">${data.user.designation ?? "-"}</div>
        </div>
        <div class="info-block">
            <div class="info-label">Pay Period</div>
            <div class="info-value">${monthLabel}</div>
        </div>
    </div>

    <div class="attendance-summary">
        <div class="summary-card">
            <div class="value">${data.totalDaysInMonth}</div>
            <div class="label">Total Days</div>
        </div>
        <div class="summary-card">
            <div class="value">${data.presentDays}</div>
            <div class="label">Present</div>
        </div>
       
        <div class="summary-card">
            <div class="value">${data.paidLeaveDays}</div>
            <div class="label">Paid Leave</div>
        </div>
        <div class="summary-card">
            <div class="value">${data.unpaidLeaveDays}</div>
            <div class="label">Unpaid Leave</div>
        </div>
        <div class="summary-card">
            <div class="value">${data.absentDays}</div>
            <div class="label">Absent</div>
        </div>
        <div class="summary-card">
            <div class="value">${data.payableDays}</div>
            <div class="label">Payable Days</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Earnings</th>
                <th class="amount-col">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Gross Salary (Monthly)</td>
                <td class="amount-col">${formatCurrency(data.grossSalary)}</td>
            </tr>
            <tr>
                <td>Per Day Salary</td>
                <td class="amount-col">${formatCurrency(data.perDaySalary)}</td>
            </tr>
            <tr>
                <td>Earned Salary (${data.payableDays} payable days)</td>
                <td class="amount-col">${formatCurrency(data.earnedSalary)}</td>
            </tr>
        </tbody>
    </table>

    <table>
        <thead>
            <tr>
                <th>Deductions</th>
                <th class="amount-col">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Unpaid Days (${data.totalUnpaidDays.toFixed(1)} days)</td>
                <td class="amount-col">${formatCurrency(data.deductionAmount)}</td>
            </tr>
        </tbody>
    </table>

    <div class="net-pay-row">
        <div class="label">Net Salary Payable</div>
        <div class="value">${formatCurrency(data.netSalary)}</div>
    </div>

    <div>
    Status: <strong>${data.status}</strong>
</div>

    <div class="footer">
        This is a system-generated salary slip and does not require a signature.
    </div>

</body>
</html>
    `;
};