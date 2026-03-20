import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, Animated, Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import firestore from '@react-native-firebase/firestore';
import RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';
import XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Buffer } from 'buffer';
import { showToast } from '../../../App';
import { getHotelConfigRef, getStoredHotelId, withHotelScope } from '../../utils/hotelSession';

const fmtCurrency = (value) => `INR ${Number(value || 0).toFixed(2)}`;

const fmtDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const parseAmount = (...values) => {
    for (const value of values) {
        const amount = Number(value);
        if (Number.isFinite(amount) && amount > 0) return amount;
    }
    return 0;
};

const normalizeText = (...parts) => parts.filter(Boolean).join(' ').toLowerCase();

const saveAndOpenFile = async ({ base64Data, filename }) => {
    const baseDirectories = Platform.OS === 'android'
        ? [RNFS.DownloadDirectoryPath, RNFS.DocumentDirectoryPath]
        : [RNFS.DocumentDirectoryPath];

    let lastError = null;

    for (const directory of baseDirectories) {
        try {
            const reportsDir = `${directory}/RoomFlowReports`;
            const filePath = `${reportsDir}/${filename}`;

            await RNFS.mkdir(reportsDir);
            await RNFS.writeFile(filePath, base64Data, 'base64');
            await FileViewer.open(filePath, {
                showOpenWithDialog: true,
                showAppsSuggestions: true,
            });
            return filePath;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('Unable to save export file.');
};

const isDiningRequest = (record) => {
    const text = normalizeText(record.type, record.category, record.details);
    return (
        text.includes('order') ||
        text.includes('dining') ||
        text.includes('food') ||
        text.includes('drink') ||
        text.includes('breakfast') ||
        text.includes('lunch') ||
        text.includes('dinner') ||
        text.includes('coffee') ||
        text.includes('pizza') ||
        text.includes('burger') ||
        text.includes('dessert')
    );
};

const StatChip = ({ icon, label, value, color }) => (
    <View style={[styles.statChip, { borderColor: `${color}30` }]}>
        <View style={[styles.statChipIcon, { backgroundColor: `${color}15` }]}>
            <Icon name={icon} size={16} color={color} />
        </View>
        <View>
            <Text style={styles.statChipLabel}>{label}</Text>
            <Text style={[styles.statChipValue, { color }]}>{value}</Text>
        </View>
    </View>
);

const ReportCard = ({ title, subtitle, icon, color, total, taxAmount, rows, downloading, onDownload }) => {
    const barAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(barAnim, { toValue: 1, duration: 800, useNativeDriver: false }).start();
    }, [barAnim, total]);

    return (
        <View style={[styles.reportCard, { borderTopColor: color }]}>
            <View style={styles.reportCardHeader}>
                <View style={[styles.reportIconCircle, { backgroundColor: `${color}18` }]}>
                    <Icon name={icon} size={22} color={color} />
                </View>
                <View style={styles.flexOne}>
                    <Text style={styles.reportCardTitle}>{title}</Text>
                    <Text style={styles.reportCardSub}>{subtitle}</Text>
                </View>
                <View style={styles.downloadGroup}>
                    <TouchableOpacity
                        style={[styles.downloadBtn, { backgroundColor: '#ef4444' }]}
                        onPress={() => onDownload('pdf')}
                        disabled={downloading}
                    >
                        {downloading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnSmText}>PDF</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.downloadBtn, { backgroundColor: '#10b981' }]}
                        onPress={() => onDownload('excel')}
                        disabled={downloading}
                    >
                        {downloading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnSmText}>Excel</Text>}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.reportSummaryRow}>
                <View style={styles.reportSummaryItem}>
                    <Text style={styles.reportSummaryLabel}>GROSS TOTAL</Text>
                    <Text style={[styles.reportSummaryValue, { color }]}>{fmtCurrency(total)}</Text>
                </View>
                <View style={styles.reportSummaryDivider} />
                <View style={styles.reportSummaryItem}>
                    <Text style={styles.reportSummaryLabel}>TAX COLLECTED</Text>
                    <Text style={styles.reportSummaryValue}>{fmtCurrency(taxAmount)}</Text>
                </View>
                <View style={styles.reportSummaryDivider} />
                <View style={styles.reportSummaryItem}>
                    <Text style={styles.reportSummaryLabel}>NET REVENUE</Text>
                    <Text style={styles.reportSummaryValue}>{fmtCurrency(total - taxAmount)}</Text>
                </View>
            </View>

            {rows.length > 0 ? (
                <View style={styles.reportRows}>
                    <Text style={styles.reportRowsLabel}>RECENT TRANSACTIONS</Text>
                    {rows.slice(0, 5).map((row, index) => (
                        <View key={`${row[0]}-${index}`} style={styles.reportRow}>
                            <View style={styles.reportRowDot} />
                            <Text style={styles.reportRowDesc} numberOfLines={1}>{row[1]}</Text>
                            <Text style={styles.reportRowDate}>{row[2]}</Text>
                            <Text style={[styles.reportRowAmt, { color }]}>{fmtCurrency(row[3])}</Text>
                        </View>
                    ))}
                    {rows.length > 5 && (
                        <Text style={styles.reportRowsMore}>+{rows.length - 5} more transactions in report</Text>
                    )}
                </View>
            ) : (
                <View style={styles.emptyReport}>
                    <Icon name="inbox" size={22} color="#cbd5e1" />
                    <Text style={styles.emptyReportText}>No transactions yet</Text>
                </View>
            )}
        </View>
    );
};

export default function Analytics() {
    const [loading, setLoading] = useState(true);
    const [taxRate, setTaxRate] = useState(0);
    const [foodRows, setFoodRows] = useState([]);
    const [foodTotal, setFoodTotal] = useState(0);
    const [expRows, setExpRows] = useState([]);
    const [expTotal, setExpTotal] = useState(0);
    const [lcRows, setLcRows] = useState([]);
    const [lcTotal, setLcTotal] = useState(0);
    const [guestLogs, setGuestLogs] = useState([]);
    const [downloading, setDownloading] = useState(null);

    useEffect(() => {
        let requestDocs = [];
        let legacyOrderDocs = [];
        let unsubscribers = [];

        const rebuildRevenue = () => {
            const diningRows = [
                ...requestDocs
                    .filter((doc) => isDiningRequest(doc) && parseAmount(doc.totalPrice, doc.total, doc.amount) > 0)
                    .map((doc) => ([
                        `REQ-${doc.id}`,
                        doc.details || doc.items?.map((item) => item.name).join(', ') || 'Room Service',
                        fmtDate(doc.createdAt),
                        parseAmount(doc.totalPrice, doc.total, doc.amount),
                        doc.room || '-',
                        doc.guestName || '-',
                    ])),
                ...legacyOrderDocs
                    .filter((doc) => parseAmount(doc.total, doc.totalPrice, doc.amount) > 0)
                    .map((doc) => ([
                        `ORD-${doc.id}`,
                        doc.items ? doc.items.map((item) => item.name).join(', ') : (doc.details || 'Room Service'),
                        fmtDate(doc.createdAt),
                        parseAmount(doc.total, doc.totalPrice, doc.amount),
                        doc.room || '-',
                        doc.guestName || '-',
                    ])),
            ];

            const serviceRows = requestDocs
                .filter((doc) => !isDiningRequest(doc))
                .filter((doc) => parseAmount(doc.amount, doc.totalPrice, doc.total) > 0)
                .filter((doc) => doc.status !== 'Denied' && doc.status !== 'Cancelled')
                .map((doc) => ([
                    doc.id,
                    doc.details || doc.type || 'Service',
                    fmtDate(doc.createdAt),
                    parseAmount(doc.amount, doc.totalPrice, doc.total),
                    doc.room || '-',
                    doc.guestName || '-',
                ]));

            setFoodRows(diningRows);
            setFoodTotal(diningRows.reduce((sum, row) => sum + Number(row[3] || 0), 0));
            setExpRows(serviceRows);
            setExpTotal(serviceRows.reduce((sum, row) => sum + Number(row[3] || 0), 0));
        };

        const init = async () => {
            const hotelId = await getStoredHotelId();

            unsubscribers = [
                getHotelConfigRef(hotelId).onSnapshot((snap) => {
                    if (snap?.exists) setTaxRate(snap.data().taxRate || 0);
                }),
                withHotelScope(firestore().collection('requests'), hotelId)
                    .orderBy('createdAt', 'desc')
                    .limit(200)
                    .onSnapshot((snap) => {
                        requestDocs = snap ? snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) : [];
                        rebuildRevenue();
                        setLoading(false);
                    }),
                withHotelScope(firestore().collection('orders'), hotelId)
                    .orderBy('createdAt', 'desc')
                    .limit(200)
                    .onSnapshot((snap) => {
                        legacyOrderDocs = snap ? snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) : [];
                        rebuildRevenue();
                    }, () => {}),
                withHotelScope(firestore().collection('late_checkout_requests'), hotelId)
                    .limit(200)
                    .onSnapshot((snap) => {
                        const rows = snap
                            ? snap.docs
                                .map((doc) => ({ id: doc.id, ...doc.data() }))
                                .filter((doc) => doc.status === 'approved')
                                .sort((a, b) => {
                                    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                                    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                                    return timeB - timeA;
                                })
                                .map((doc) => ([
                                    doc.id,
                                    `Room ${doc.room || '-'} - ${doc.guestName || 'Guest'} (${doc.extraHours || 0} hrs)`,
                                    fmtDate(doc.createdAt),
                                    parseAmount(doc.totalFee),
                                    doc.room || '-',
                                    doc.guestName || '-',
                                ]))
                            : [];

                        setLcRows(rows);
                        setLcTotal(rows.reduce((sum, row) => sum + Number(row[3] || 0), 0));
                        setLoading(false);
                    }, () => setLoading(false)),
                withHotelScope(firestore().collection('guests'), hotelId)
                    .orderBy('checkIn', 'desc')
                    .limit(100)
                    .onSnapshot((snap) => {
                        setGuestLogs(snap ? snap.docs.map(d => ({ id: d.id, ...d.data() })) : []);
                    }, () => {}),
            ];
        };

        init();

        return () => {
            unsubscribers.forEach((unsubscribe) => unsubscribe && unsubscribe());
        };
    }, []);

    const taxFactor = taxRate / 100;

    const handleDownload = async (type, format, headers, rows, total) => {
        setDownloading(type);
        try {
            const taxAmount = total * taxFactor;
            const netAmount = total - taxAmount;

            if (format === 'excel') {
                const worksheetData = [
                    headers,
                    ...rows,
                ];

                if (type !== 'GuestLog') {
                    worksheetData.push(
                        [],
                        ['SUMMARY'],
                        ['Gross Total', total],
                        [`Tax (${taxRate}%)`, taxAmount],
                        ['Net Revenue', netAmount]
                    );
                }

                const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, `${type} Report`);
                const workbookOut = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

                const savedPath = await saveAndOpenFile({
                    base64Data: Buffer.from(workbookOut).toString('base64'),
                    filename: `${type}_Report.xlsx`,
                });
                showToast(`Saved report to ${savedPath}`, 'success');
            } else if (format === 'pdf') {
                const doc = new jsPDF();
                doc.setFontSize(18);
                doc.text(`RoomFlow ${type} Report`, 14, 22);

                autoTable(doc, {
                    startY: 30,
                    head: [headers],
                    body: rows,
                });

                const finalY = doc.lastAutoTable.finalY || 30;
                
                if (type !== 'GuestLog') {
                    doc.setFontSize(14);
                    doc.text('Summary', 14, finalY + 15);
                    doc.setFontSize(12);
                    doc.text(`Gross Total: ${fmtCurrency(total)}`, 14, finalY + 25);
                    doc.text(`Tax (${taxRate}%): ${fmtCurrency(taxAmount)}`, 14, finalY + 32);
                    doc.text(`Net Revenue: ${fmtCurrency(netAmount)}`, 14, finalY + 39);
                }

                const pdfBuffer = doc.output('arraybuffer');
                const savedPath = await saveAndOpenFile({
                    base64Data: Buffer.from(pdfBuffer).toString('base64'),
                    filename: `${type}_Report.pdf`,
                });
                showToast(`Saved report to ${savedPath}`, 'success');
            }
        } catch (error) {
            showToast('Could not export the report.', 'error');
        } finally {
            setDownloading(null);
        }
    };

    const grandTotal = foodTotal + expTotal + lcTotal;
    const grandTax = grandTotal * taxFactor;
    const amountHeaders = ['ID', 'Description', 'Date', 'Amount (INR)', 'Room', 'Guest'];
    const lateCheckoutHeaders = ['Request ID', 'Description', 'Date', 'Fee (INR)', 'Room', 'Guest'];
    const guestHeaders = ['Guest Name', 'Room', 'Check In', 'Check Out', 'Status', 'Guest ID'];
    
    const guestExportRows = guestLogs.map((log) => ([
        log.name || 'Unknown',
        log.room || '-',
        fmtDate(log.checkIn),
        log.checkedOutAt ? fmtDate(log.checkedOutAt) : 'Pending',
        log.status || 'Active',
        log.guestID || '-'
    ]));

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
                <Text style={styles.title}>Revenue Reports</Text>
                <Text style={styles.subtitle}>Dining, services, and extension fees with live export-ready totals</Text>
                {taxRate > 0 && (
                    <View style={styles.taxBadge}>
                        <Icon name="percent" size={11} color="#d97706" />
                        <Text style={styles.taxBadgeText}>Tax Rate: {taxRate}%</Text>
                    </View>
                )}
            </View>

            <View style={styles.grandSummaryCard}>
                <View style={styles.grandSummaryTop}>
                    <Icon name="trending-up" size={20} color="#10b981" />
                    <Text style={styles.grandSummaryTitle}>All Revenue</Text>
                </View>
                <Text style={styles.grandSummaryValue}>{fmtCurrency(grandTotal)}</Text>
                <View style={styles.grandSummaryChips}>
                    <StatChip icon="coffee" label="Dining" value={fmtCurrency(foodTotal)} color="#6366f1" />
                    <StatChip icon="briefcase" label="Services" value={fmtCurrency(expTotal)} color="#f59e0b" />
                    <StatChip icon="clock" label="Late CO" value={fmtCurrency(lcTotal)} color="#ec4899" />
                </View>
                <View style={styles.grandTaxRow}>
                    <Text style={styles.grandTaxLabel}>Total Tax Collected ({taxRate}%)</Text>
                    <Text style={styles.grandTaxValue}>{fmtCurrency(grandTax)}</Text>
                </View>
            </View>

            {/* Guest Log Matrix */}
            <View style={styles.reportCard}>
                <View style={styles.reportCardHeader}>
                    <View style={[styles.reportIconCircle, { backgroundColor: '#eef2ff' }]}>
                        <Icon name="users" size={22} color="#4f46e5" />
                    </View>
                    <View style={styles.flexOne}>
                        <Text style={styles.reportCardTitle}>Guest Access Log</Text>
                        <Text style={styles.reportCardSub}>Automated registry of all check-ins and check-outs</Text>
                    </View>
                    <View style={styles.downloadGroup}>
                        <TouchableOpacity
                            style={[styles.downloadBtn, { backgroundColor: '#ef4444' }]}
                            onPress={() => handleDownload('GuestLog', 'pdf', guestHeaders, guestExportRows, 0)}
                            disabled={downloading === 'GuestLog'}
                        >
                            {downloading === 'GuestLog' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnSmText}>PDF</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.downloadBtn, { backgroundColor: '#10b981' }]}
                            onPress={() => handleDownload('GuestLog', 'excel', guestHeaders, guestExportRows, 0)}
                            disabled={downloading === 'GuestLog'}
                        >
                            {downloading === 'GuestLog' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnSmText}>Excel</Text>}
                        </TouchableOpacity>
                    </View>
                </View>

                {guestLogs.length > 0 ? (
                    <View style={styles.reportRows}>
                        <Text style={styles.reportRowsLabel}>RECENT GUEST ACTIVITY</Text>
                        {guestLogs.slice(0, 10).map((log) => (
                            <View key={log.id} style={styles.reportRow}>
                                <View style={[styles.reportRowDot, { backgroundColor: log.status === 'Active' ? '#10b981' : '#64748b' }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.reportRowDesc} numberOfLines={1}>{log.name}</Text>
                                    <Text style={[styles.reportRowDate, { marginTop: 4 }]}>IN: {fmtDate(log.checkIn)}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <View style={{ backgroundColor: log.status === 'Active' ? '#dcfce7' : '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                        <Text style={{ color: log.status === 'Active' ? '#166534' : '#64748b', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
                                            {log.status === 'Active' ? 'ACTIVE RESIDENT' : 'CHECKED OUT'}
                                        </Text>
                                    </View>
                                    <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, fontWeight: '700' }}>
                                        ROOM {log.room || '-'}
                                    </Text>
                                </View>
                            </View>
                        ))}
                        {guestLogs.length > 10 && (
                            <Text style={styles.reportRowsMore}>+{guestLogs.length - 10} more registry entries</Text>
                        )}
                    </View>
                ) : (
                    <View style={styles.emptyReport}>
                        <Icon name="user-x" size={22} color="#cbd5e1" />
                        <Text style={styles.emptyReportText}>No guest registry data</Text>
                    </View>
                )}
            </View>

            <ReportCard
                title="Food and Dining Income"
                subtitle="Guest cart orders, room service, and drink purchases"
                icon="coffee"
                color="#6366f1"
                total={foodTotal}
                taxAmount={foodTotal * taxFactor}
                rows={foodRows}
                downloading={downloading === 'Food'}
                onDownload={(format) => handleDownload('Food', format, amountHeaders, foodRows, foodTotal)}
            />

            <ReportCard
                title="Service Income"
                subtitle="Amenity, spa, taxi, bar, and other billable guest requests"
                icon="briefcase"
                color="#f59e0b"
                total={expTotal}
                taxAmount={expTotal * taxFactor}
                rows={expRows}
                downloading={downloading === 'Services'}
                onDownload={(format) => handleDownload('Services', format, amountHeaders, expRows, expTotal)}
            />

            <ReportCard
                title="Late Checkout Income"
                subtitle="Approved late checkout fees collected"
                icon="clock"
                color="#ec4899"
                total={lcTotal}
                taxAmount={lcTotal * taxFactor}
                rows={lcRows}
                downloading={downloading === 'LateCheckout'}
                onDownload={(format) => handleDownload('LateCheckout', format, lateCheckoutHeaders, lcRows, lcTotal)}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
    container: { flex: 1, backgroundColor: '#f9fafb' },
    scrollContent: { paddingBottom: 50 },
    flexOne: { flex: 1 },

    header: { padding: 24, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9' },
    title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
    subtitle: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '600' },
    taxBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#fef3c7', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    taxBadgeText: { fontSize: 11, fontWeight: '800', color: '#d97706' },

    grandSummaryCard: { margin: 16, backgroundColor: '#0f172a', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.15, elevation: 8 },
    grandSummaryTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    grandSummaryTitle: { fontSize: 11, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase' },
    grandSummaryValue: { fontSize: 38, fontWeight: '900', color: '#fff', marginBottom: 16 },
    grandSummaryChips: { flexDirection: 'row', gap: 10 },
    grandTaxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#1e293b' },
    grandTaxLabel: { fontSize: 11, fontWeight: '700', color: '#475569' },
    grandTaxValue: { fontSize: 14, fontWeight: '900', color: '#f59e0b' },

    statChip: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    statChipIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    statChipLabel: { fontSize: 8, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
    statChipValue: { fontSize: 12, fontWeight: '900', marginTop: 2 },

    reportCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#fff', borderRadius: 20, borderTopWidth: 3, shadowColor: '#000', shadowOpacity: 0.05, elevation: 3, overflow: 'hidden' },
    reportCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    reportIconCircle: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    reportCardTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
    reportCardSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    downloadGroup: { flexDirection: 'row', gap: 8 },
    downloadBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    btnSmText: { fontSize: 11, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },

    reportSummaryRow: { flexDirection: 'row', padding: 16 },
    reportSummaryItem: { flex: 1, alignItems: 'center' },
    reportSummaryDivider: { width: 1, backgroundColor: '#f1f5f9' },
    reportSummaryLabel: { fontSize: 8, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    reportSummaryValue: { fontSize: 14, fontWeight: '900', color: '#0f172a' },

    reportRows: { paddingHorizontal: 16, paddingBottom: 16 },
    reportRowsLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
    reportRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc', gap: 8 },
    reportRowDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#e2e8f0' },
    reportRowDesc: { flex: 1, fontSize: 12, fontWeight: '700', color: '#334155' },
    reportRowDate: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
    reportRowAmt: { fontSize: 13, fontWeight: '900', marginLeft: 6 },
    reportRowsMore: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 8, textAlign: 'center' },

    emptyReport: { alignItems: 'center', padding: 24 },
    emptyReportText: { fontSize: 12, color: '#cbd5e1', fontWeight: '700', marginTop: 8 },
});
