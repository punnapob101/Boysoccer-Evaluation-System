import React, { useState, useMemo, useRef } from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
} from 'recharts';
import {
    Search,
    Activity,
    Award,
    Users,
    BarChart3,
    Upload,
    Lock,
    LogOut,
    Printer,
    UserCog,
    FileText,
    Camera,
    User,
    Shield,
    ArrowLeft,
    ArrowRight
} from 'lucide-react';

import logoImage from './logo 1.png';

// --- CONFIGURATION ---

const CLASS_CONFIG = {
    coach_kae: {
        name: 'รุ่นโค้ชเก๋ (GK)',
        color: 'bg-yellow-600',
        border: 'border-yellow-600',
        bgLight: 'bg-yellow-50',
        text: 'text-yellow-800',
    },
    coach_saman: {
        name: 'รุ่นโค้ชสมาน',
        color: 'bg-blue-600',
        border: 'border-blue-600',
        bgLight: 'bg-blue-50',
        text: 'text-blue-800',
    },
    coach_nong: {
        name: 'รุ่นโค้ชหน่อง',
        color: 'bg-purple-600',
        border: 'border-purple-600',
        bgLight: 'bg-purple-50',
        text: 'text-purple-800',
    },
    coach_boy: {
        name: 'รุ่นโค้ชบอย',
        color: 'bg-green-600',
        border: 'border-green-600',
        bgLight: 'bg-green-50',
        text: 'text-green-800',
    },
};

const INITIAL_SCHEMAS = {
    coach_boy: { labels: {}, categories: { Skills: [] } },
    coach_kae: { labels: {}, categories: { Skills: [] } },
    coach_saman: { labels: {}, categories: { Skills: [] } },
    coach_nong: { labels: {}, categories: { Skills: [] } },
};

const INITIAL_ACADEMY_DATA = {
    coach_kae: [],
    coach_saman: [],
    coach_nong: [],
    coach_boy: [],
};

// --- Main Component ---
export default function SoccerAcademyDashboard() {
    // Data State
    const [academyData, setAcademyData] = useState(INITIAL_ACADEMY_DATA);
    const [schemas, setSchemas] = useState(INITIAL_SCHEMAS);

    // App State
    const [showLanding, setShowLanding] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [selectedClass, setSelectedClass] = useState('coach_boy');
    const [selectedPlayerId, setSelectedPlayerId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Login State
    const [coachPassword, setCoachPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    // Refs
    const fileInputRef = useRef(null);

    // --- Helpers ---
    const getCurrentClassData = () => academyData[selectedClass] || [];

    const getCurrentSchema = () => {
        return schemas[selectedClass] || { labels: {}, categories: { Skills: [] } };
    };

    const currentConfig = CLASS_CONFIG[selectedClass];

    // คำนวณสีของกราฟแยกออกมา เพื่อไม่ให้ JSX แดง
    const chartFillColor = useMemo(() => {
        if (currentConfig.color.includes('green')) return '#22c55e';
        if (currentConfig.color.includes('blue')) return '#3b82f6';
        if (currentConfig.color.includes('yellow')) return '#eab308';
        return '#a855f7';
    }, [currentConfig.color]);

    // --- CSV Parsing Logic ---
    const handleFileUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result;
            if (content) parseDynamicCSV(content);
        };
        reader.readAsText(file);
    };

    const parseDynamicCSV = (csvText) => {
        const lines = csvText.split(/\r\n|\n/).filter((line) => line.trim() !== '');
        if (lines.length < 2) {
            alert('ไฟล์ CSV ไม่ถูกต้อง');
            return;
        }

        const headers = lines[0].split(',').map((h) => h.trim());

        // Identify Columns
        const nameIdx = headers.findIndex(
            (h) => h.includes('ชื่อ') && !h.includes('นามสกุล')
        );
        const surnameIdx = headers.findIndex((h) => h.includes('นามสกุล'));
        const dobIdx = headers.findIndex(
            (h) =>
                h.includes('วันเกิด') ||
                h.includes('วันเดือนปีเกิด') ||
                h.toLowerCase().includes('dob')
        );
        const yearIdx = headers.findIndex(
            (h) => h.includes('รุ่น') || h.includes('ปี')
        );
        const posIdx = headers.findIndex((h) => h.includes('ตำแหน่ง'));
        const idIdx = headers.findIndex((h) => h.includes('รหัส'));
        const imgIdx = headers.findIndex((h) => h.includes('รูป'));

        if (nameIdx === -1) {
            alert('ไม่พบคอลัมน์ "ชื่อ"');
            return;
        }

        // Dynamic Skills
        const excludeIndices = [
            nameIdx,
            surnameIdx,
            dobIdx,
            yearIdx,
            posIdx,
            idIdx,
            imgIdx,
        ];
        const skillIndices = [];
        const newLabels = {};
        const skillKeys = [];

        headers.forEach((header, idx) => {
            // Logic การคัดเลือกหัวข้อทักษะ
            const isExcluded = excludeIndices.includes(idx);
            const lowerHeader = header.toLowerCase();

            // กรองคำว่า "ชื่อ", "Name", "นามสกุล" ออกจากรายการทักษะ เพื่อไม่ให้ไปโผล่ในกราฟ
            const isNameRelated =
                lowerHeader.includes('ชื่อ') ||
                lowerHeader.includes('name') ||
                lowerHeader.includes('นามสกุล') ||
                lowerHeader.includes('surname');

            if (!isExcluded && !isNameRelated && idx !== -1) {
                const key = `skill_${idx}`;
                skillIndices.push(idx);
                newLabels[key] = header;
                skillKeys.push(key);
            }
        });

        const newSchema = {
            labels: newLabels,
            categories: { รายการประเมินทักษะ: skillKeys },
        };

        const newPlayers = [];

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length < headers.length) continue;

            const stats = {};
            skillIndices.forEach((idx) => {
                const key = `skill_${idx}`;
                const val = parseFloat(cols[idx]?.trim());
                stats[key] = isNaN(val) ? 0 : val;
            });

            let firstName = cols[nameIdx]?.trim() || 'Unknown';
            let lastName = surnameIdx !== -1 ? cols[surnameIdx]?.trim() || '' : '';

            if (surnameIdx === -1 && firstName.includes(' ')) {
                const parts = firstName.split(' ');
                firstName = parts[0];
                lastName = parts.slice(1).join(' ');
            }

            let dob =
                dobIdx !== -1
                    ? (cols[dobIdx]?.trim() || '').replace(/[^0-9]/g, '')
                    : '';

            newPlayers.push({
                id: idIdx !== -1 ? cols[idIdx]?.trim() : `imported_${i}`,
                name: `${firstName} ${lastName}`,
                dob: dob,
                year: yearIdx !== -1 ? parseInt(cols[yearIdx]?.trim()) || 0 : 0,
                position: posIdx !== -1 ? cols[posIdx]?.trim() : 'Unknown',
                img: '',
                stats: stats,
            });
        }

        if (newPlayers.length > 0) {
            setAcademyData((prev) => ({ ...prev, [selectedClass]: newPlayers }));
            setSchemas((prev) => ({ ...prev, [selectedClass]: newSchema }));
            setSelectedPlayerId(newPlayers[0].id);
            alert(
                `นำเข้าข้อมูลสำเร็จ: ${newPlayers.length} รายชื่อ ลงใน ${currentConfig.name}`
            );
        } else {
            alert('ไม่พบข้อมูลที่ถูกต้อง');
        }
    };

    // --- Actions ---
    const handleLogin = () => {

        if (btoa(coachPassword) === 'Ym95c29jY2VyMjAxNw==') {
            setIsLoggedIn(true);
            setLoginError('');
        } else {
            setLoginError('รหัสผ่านไม่ถูกต้อง');
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setShowLanding(true); // Go back to landing page
        setCoachPassword('');
        setSelectedClass('coach_boy');
    };

    const handlePrint = () => {
        const isSandboxed =
            window.origin === 'null' ||
            window.location.origin.includes('usercontent.goog');
        if (isSandboxed) {
            alert(
                'คำสั่ง Print ถูกส่งแล้ว!'
            );
        }
        window.print();
    };

    const triggerFileInput = () => fileInputRef.current?.click();

    // --- Calcs ---
    const currentList = getCurrentClassData();
    const currentSchema = getCurrentSchema();

    const filteredPlayers = useMemo(() => {
        return currentList.filter((p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [currentList, searchTerm]);

    const selectedPlayer = useMemo(
        () =>
            currentList.find((p) => p.id === selectedPlayerId) || currentList[0],
        [currentList, selectedPlayerId]
    );

    const radarData = useMemo(() => {
        if (!selectedPlayer) return [];
        return Object.keys(currentSchema.labels).map((key) => ({
            subject: currentSchema.labels[key],
            A: selectedPlayer.stats[key] || 0,
            fullMark: 4, // MAX SCORE IS 4
        }));
    }, [selectedPlayer, currentSchema]);

    const calculateAverage = (stats) => {
        const values = Object.values(stats);
        if (values.length === 0) return '0.0';
        return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
    };

    // ================= RENDER =================

    // 1. LANDING PAGE
    if (showLanding) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-green-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl"></div>

                <div className="bg-white/5 backdrop-blur-xl p-12 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center max-w-lg w-full z-10">
                    <div className="w-32 h-32 bg-white rounded-full p-4 mb-8 shadow-xl flex items-center justify-center">
                        {/* Logo for Landing Page */}
                        <img
                            src={logoImage}
                            onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/150?text=LOGO"; }}
                            alt="Boy Soccer Academy Logo"
                            className="w-full h-full object-contain"
                        />
                    </div>

                    <h1 className="text-4xl md:text-5xl font-black text-white text-center mb-2 tracking-tight">
                        Boy Soccer
                        <span className="text-green-400 block mt-1">Academy</span>
                    </h1>

                    <p className="text-slate-400 text-center mb-10 font-light text-lg">
                        ระบบจัดการและประเมินผลนักกีฬาฟุตบอล
                    </p>

                    <button
                        onClick={() => setShowLanding(false)}
                        className="group w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white text-xl font-bold py-4 px-8 rounded-2xl shadow-lg shadow-green-500/30 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3"
                    >
                        เข้าสู่ระบบโค้ช
                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <div className="mt-8 text-xs text-slate-500 text-center">
                        © 2025 Boy Soccer Academy. All Rights Reserved.
                    </div>
                </div>
            </div>
        );
    }

    // 2. LOGIN SCREEN
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-500 to-emerald-600"></div>

                    <button
                        onClick={() => setShowLanding(true)}
                        className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
                    </button>

                    <div className="text-center mt-6 mb-8">
                        <div className="w-16 h-16 mx-auto bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-600">
                            <UserCog className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800">
                            ยืนยันตัวตนโค้ช
                        </h1>
                        <p className="text-slate-500 text-sm">
                            กรุณากรอกรหัสผ่านเพื่อเข้าใช้งาน
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider">
                                Password
                            </label>
                            <input
                                type="password"
                                className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 outline-none focus:ring-green-500 transition-all bg-slate-50 focus:bg-white"
                                value={coachPassword}
                                onChange={(e) => setCoachPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                placeholder="Enter password..."
                            />
                            {loginError && (
                                <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                                    <Shield className="w-3 h-3" /> {loginError}
                                </p>
                            )}
                        </div>

                        <button
                            onClick={handleLogin}
                            className="w-full bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-900 transition-transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Lock className="w-4 h-4" /> เข้าสู่ระบบ
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 3. DASHBOARD (UPDATED LAYOUT)
    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800 print:bg-white">
            <style>
                {`
        @media print {
          @page { size: A4; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          ::-webkit-scrollbar { display: none; }
          .no-print { display: none !important; }
        }
      `}
            </style>

            <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
            />

            {/* HEADER (App Bar) */}
            <header className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-md print:hidden no-print">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                            <Activity className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold leading-tight">
                                Boy Soccer Academy
                            </h1>
                            <p className="text-xs text-slate-400">Coach Management System</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-800 p-1 rounded-xl">
                        {Object.keys(CLASS_CONFIG).map((key) => {
                            const isActive = selectedClass === key;
                            const config = CLASS_CONFIG[key];
                            return (
                                <button
                                    key={key}
                                    onClick={() => {
                                        setSelectedClass(key);
                                        setSelectedPlayerId(null);
                                    }}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${isActive
                                        ? 'bg-white text-slate-900 shadow'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {config.name}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={triggerFileInput}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-xs transition-all shadow-lg hover:shadow-green-500/20"
                        >
                            <Upload className="w-4 h-4" /> Import CSV
                        </button>
                        <div className="w-px h-8 bg-slate-700 mx-2"></div>
                        <button
                            onClick={handleLogout}
                            className="text-slate-400 hover:text-red-400 transition-colors p-2"
                            title="ออกจากระบบ"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 print:block print:p-0 print:m-0 print:w-full print:max-w-none">
                {/* SIDEBAR */}
                <div className="lg:col-span-3 space-y-4 print:hidden no-print">
                    <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <Users className="w-4 h-4" /> รายชื่อนักกีฬา
                            </h2>
                            <span
                                className={`text-[10px] px-2 py-1 rounded-full font-bold ${currentConfig.bgLight} ${currentConfig.text}`}
                            >
                                {currentList.length} คน
                            </span>
                        </div>

                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อ..."
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-200 text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-280px)] flex flex-col">
                        <div className="overflow-y-auto flex-grow divide-y divide-slate-50 custom-scrollbar">
                            {filteredPlayers.length > 0 ? (
                                filteredPlayers.map((player) => (
                                    <button
                                        key={player.id}
                                        onClick={() => setSelectedPlayerId(player.id)}
                                        className={`w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-center gap-3 group ${selectedPlayerId === player.id
                                            ? `${currentConfig.bgLight} border-l-4 ${currentConfig.border}`
                                            : 'border-l-4 border-transparent'
                                            }`}
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${selectedPlayerId === player.id
                                                ? 'bg-white text-slate-800'
                                                : 'bg-slate-100 text-slate-500'
                                                }`}
                                        >
                                            {player.name.charAt(0)}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div
                                                className={`font-semibold truncate ${selectedPlayerId === player.id
                                                    ? 'text-slate-900'
                                                    : 'text-slate-600'
                                                    }`}
                                            >
                                                {player.name}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                {player.position}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-400 text-xs">
                                    {currentList.length === 0
                                        ? 'กรุณา Import CSV'
                                        : 'ไม่พบรายชื่อ'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* MAIN REPORT AREA */}
                <div className="lg:col-span-9 print:w-full">
                    {!selectedPlayer ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 print:hidden no-print">
                            <FileText className="w-16 h-16 mb-4" />
                            <p>เลือกรายชื่อเพื่อดูรายงาน</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 print:shadow-none print:border-none print:rounded-none">
                            {/* Print Control Bar */}
                            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 print:hidden no-print">
                                <h3 className="font-bold text-slate-700">Evaluation Report</h3>
                                <button
                                    onClick={handlePrint}
                                    className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 text-sm transition-all"
                                >
                                    <Printer className="w-4 h-4" /> พิมพ์รายงาน (PDF)
                                </button>
                            </div>

                            {/* --- REPORT CARD (A4 COMPACT) --- */}
                            <div
                                id="report-card"
                                className="print:w-[210mm] print:h-[297mm] print:mx-auto bg-white flex flex-col h-full"
                            >
                                {/* 1. Header Banner */}
                                <div className="bg-slate-900 text-white p-8 print:p-5 flex items-center justify-between -webkit-print-color-adjust-exact">
                                    {/* Left: Logo & Player Name */}
                                    <div className="flex items-center gap-6">
                                        {/* Logo Area - Reduced size in print */}
                                        <div className="w-24 h-24 print:w-16 print:h-16 bg-white rounded-full p-2 flex items-center justify-center shadow-lg">
                                            <img
                                                src={logoImage}
                                                alt="Academy Logo"
                                                className="w-full h-full object-contain"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        </div>

                                        {/* Name Area */}
                                        <div>
                                            {/* Smaller font in print */}
                                            <h1 className="text-4xl print:text-3xl font-black uppercase tracking-wider text-white">
                                                {selectedPlayer.name}
                                            </h1>
                                            <div className="flex flex-col gap-1 mt-2 print:mt-1">
                                                <div className="flex items-center gap-3 text-slate-300 text-sm print:text-xs">
                                                    <span className="flex items-center gap-1"><Award className="w-4 h-4 print:w-3 print:h-3" /> {currentConfig.name}</span>
                                                    <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                                                    <span className="flex items-center gap-1 uppercase"><Users className="w-4 h-4 print:w-3 print:h-3" /> {selectedPlayer.position}</span>
                                                </div>
                                                <div className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded inline-block w-fit print:scale-90 print:origin-left">
                                                    ID: {selectedPlayer.id}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Rating Big Score */}
                                    <div className="text-right">
                                        {/* Smaller font in print */}
                                        <div className="text-7xl print:text-6xl font-black text-yellow-400 leading-none">
                                            {calculateAverage(selectedPlayer.stats)}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Overall Rating</div>
                                    </div>
                                </div>

                                {/* 2. Content Grid */}
                                <div className="p-8 print:p-5 flex-grow">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-4 h-full">

                                        {/* Left: Radar Chart */}
                                        <div className="flex flex-col items-center justify-start h-full"> {/* Parent Cell */}
                                            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2 w-full border-b border-slate-200 pb-2 text-lg print:text-base">
                                                <Activity className="w-5 h-5 print:w-4 print:h-4 text-green-600" /> Skill Analysis
                                            </h3>

                                            {/* Chart Container Wrapper */}
                                            <div className="flex-grow w-full flex items-center justify-center min-h-[300px]">
                                                <div className="w-full h-[350px] print:h-[300px] relative mx-auto">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <RadarChart
                                                            cx="50%" // FORCE CENTER
                                                            cy="50%" // FORCE CENTER
                                                            outerRadius="65%" // SAFE SIZE
                                                            data={radarData}
                                                        // NO WEIRD MARGINS
                                                        >
                                                            <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" />
                                                            <PolarAngleAxis
                                                                dataKey="subject"
                                                                tick={{
                                                                    fill: '#1e293b',
                                                                    fontSize: 11, // Slightly smaller font
                                                                    fontWeight: 700,
                                                                }}
                                                            />
                                                            <PolarRadiusAxis
                                                                angle={30}
                                                                domain={[0, 4]}
                                                                tick={false}
                                                                axisLine={false}
                                                            />
                                                            <Radar
                                                                dataKey="A"
                                                                stroke="#0f172a"
                                                                strokeWidth={3}
                                                                fill={chartFillColor} // ใช้ตัวแปรที่แยกไว้ แทนการเขียน logic ยาวๆ
                                                                fillOpacity={0.4}
                                                            />
                                                        </RadarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Stats Table */}
                                        <div>
                                            <h3 className="font-bold text-slate-800 mb-6 print:mb-2 flex items-center gap-2 border-b border-slate-200 pb-2 text-lg print:text-base">
                                                <BarChart3 className="w-5 h-5 print:w-4 print:h-4 text-green-600" /> Performance Details
                                            </h3>
                                            {/* Reduced spacing in print */}
                                            <div className="space-y-6 print:space-y-2">
                                                {Object.keys(currentSchema.categories).map((catName) => (
                                                    <div key={catName}>
                                                        {/* Reduced spacing in print */}
                                                        <div className="space-y-4 print:space-y-1">
                                                            {currentSchema.categories[catName].map(
                                                                (key) => (
                                                                    <div
                                                                        key={key}
                                                                        className="flex items-center justify-between text-sm group"
                                                                    >
                                                                        {/* Smaller text in print (text-xs) */}
                                                                        <span className="font-medium text-slate-600 w-1/2 group-hover:text-slate-900 transition-colors text-sm print:text-xs truncate pr-2">
                                                                            {currentSchema.labels[key]}
                                                                        </span>

                                                                        {/* Progress Bar Container - Thinner in print */}
                                                                        <div className="flex-grow h-3 print:h-1.5 bg-slate-100 rounded-full mx-3 overflow-hidden border border-slate-100 relative shadow-inner">
                                                                            <div className="absolute left-1/4 top-0 bottom-0 w-px bg-white/50"></div>
                                                                            <div className="absolute left-2/4 top-0 bottom-0 w-px bg-white/50"></div>
                                                                            <div className="absolute left-3/4 top-0 bottom-0 w-px bg-white/50"></div>

                                                                            <div
                                                                                className={`h-full rounded-full transition-all duration-500 ${selectedPlayer.stats[key] >= 4 ? 'bg-green-500' :
                                                                                    selectedPlayer.stats[key] >= 3 ? 'bg-blue-500' :
                                                                                        selectedPlayer.stats[key] >= 2 ? 'bg-yellow-400' : 'bg-red-400'
                                                                                    } print:bg-slate-800`}
                                                                                style={{
                                                                                    width: `${(selectedPlayer.stats[key] / 4) * 100}%`,
                                                                                }}
                                                                            ></div>
                                                                        </div>
                                                                        {/* Smaller score text in print */}
                                                                        <span className="font-black text-slate-900 w-8 text-right text-base print:text-sm">
                                                                            {selectedPlayer.stats[key]}
                                                                        </span>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer with Legend */}
                                {/* Reduced padding in print */}
                                <div className="p-8 pt-6 print:p-4 print:pt-2 border-t border-slate-200 print:mt-auto bg-slate-50">
                                    <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                                        {/* Scoring Legend */}
                                        <div className="text-left w-full">
                                            <h4 className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                                Scoring Criteria
                                            </h4>
                                            <div className="flex gap-4 text-[10px]">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                    <span className="text-slate-600 font-bold">4 (Very Good)</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                    <span className="text-slate-600 font-bold">3 (Good)</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                                    <span className="text-slate-600 font-bold">2 (Fair)</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                                    <span className="text-slate-600 font-bold">1 (Improve)</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right text-[10px] text-slate-400 whitespace-nowrap">
                                            <div className="font-bold text-slate-500">BOY SOCCER ACADEMY</div>
                                            <div>Printed on {new Date().toLocaleDateString('th-TH')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
