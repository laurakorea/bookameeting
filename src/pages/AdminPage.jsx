import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { CheckCircle, XCircle, Clock, Mail, Plus, X, Users, User } from 'lucide-react';

const AdminPage = () => {
    const [activeTab, setActiveTab] = useState('bookings'); // 'bookings', 'companies', 'users'
    const [bookings, setBookings] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [selectedCompanyMembers, setSelectedCompanyMembers] = useState(null); // { name: string, members: array }
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

    useEffect(() => {
        document.title = "회의실 관리";
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) {
            favicon.href = "/settings.svg";
        }

        if (activeTab === 'bookings') fetchPendingBookings();
        if (activeTab === 'companies') fetchCompanies();
        if (activeTab === 'users') fetchUsers();
    }, [activeTab]);

    const generateCompanyId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const fetchCompanies = async () => {
        if (!supabase) return;

        setLoadingCompanies(true);
        const { data: companiesData, error: companiesError } = await supabase
            .from('companies')
            .select('*')
            .order('created_at', { ascending: false });

        const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('*');

        if (companiesError || profilesError) {
            console.error('Fetch Companies/Profiles Error:', companiesError || profilesError);
            alert('정보를 불러오는 중 오류가 발생했습니다.');
            setLoadingCompanies(false);
            return;
        }

        if (companiesData) {
            const processedCompanies = companiesData.map(c => ({
                ...c,
                memberCount: profilesData ? profilesData.filter(p => p.company_id === c.id).length : 0,
                members: profilesData ? profilesData.filter(p => p.company_id === c.id) : []
            }));
            setCompanies(processedCompanies);
        }
        setLoadingCompanies(false);
    };

    const handleToggleActive = async (companyId, currentStatus) => {
        const newStatus = !currentStatus;
        const msg = newStatus ? '활성화' : '비활성화';
        if (!window.confirm(`이 회사를 ${msg} 하시겠습니까? 소속 모든 사용자의 접속이 차단될 수 있습니다.`)) return;

        const { error } = await supabase
            .from('companies')
            .update({ is_active: newStatus })
            .eq('id', companyId);

        if (error) {
            alert('업데이트 중 오류가 발생했습니다: ' + error.message);
        } else {
            fetchCompanies();
        }
    };

    const handleUpdateExpiry = async (companyId, newDate) => {
        const { error } = await supabase
            .from('companies')
            .update({ valid_until: newDate })
            .eq('id', companyId);

        if (error) {
            alert('만료일 업데이트 중 오류가 발생했습니다: ' + error.message);
        } else {
            fetchCompanies();
        }
    };

    const fetchUsers = async () => {
        if (!supabase) return;
        const { data, error } = await supabase
            .from('profiles')
            .select('*, companies(name)')
            .order('name');

        if (error) {
            console.error('Fetch Users Error:', error);
            alert('사용자 정보를 불러오는 중 오류가 발생했습니다: ' + error.message);
            return;
        }
        if (data) setUsers(data.map(u => ({ ...u, company_name: `${u.companies?.name} (${u.company_id})` })));
    };

    const handleCreateCompany = async () => {
        if (!newCompanyName) return;

        if (!supabase) {
            alert('Supabase 연결 설정(.env)이 완료되지 않았습니다. 가이드를 확인해 주세요.');
            return;
        }

        const newId = generateCompanyId();
        const { error } = await supabase.from('companies').insert([{ id: newId, name: newCompanyName }]);

        if (error) {
            console.error(error);
            alert('회사 생성 중 오류가 발생했습니다: ' + error.message);
            return;
        }

        alert(`회사 '${newCompanyName}'가 생성되었습니다. ID: ${newId}`);
        fetchCompanies();
        setNewCompanyName('');
        setIsCompanyModalOpen(false);
    };

    const fetchPendingBookings = async () => {
        if (!supabase) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select('*, companies(name)')
            .order('created_at', { ascending: false });

        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('name, email, phone, company_id');

        if (bookingsError || profilesError) {
            console.error('Fetch Bookings Error:', bookingsError || profilesError);
            alert('예약 정보를 불러오는 중 오류가 발생했습니다.');
        } else if (bookingsData) {
            const enrichedBookings = bookingsData.map(b => {
                const profile = profilesData?.find(p => p.name === b.user_id && p.company_id === b.company_id);
                return {
                    ...b,
                    user_email: profile?.email || '-',
                    user_phone: profile?.phone || '-'
                };
            });
            setBookings(enrichedBookings);
        }
        setLoading(false);
    };

    const handleApprove = async (id, userId, companyId) => {
        if (!window.confirm('이 예약을 승인하시겠습니까?')) return;
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'approved' } : b));
        await supabase.from('bookings').update({ status: 'approved' }).eq('id', id);
        alert(`${companyId}의 ${userId}님 예약을 승인했습니다.`);
    };

    const handleReject = async (id, userId, companyId) => {
        if (!window.confirm('이 예약을 거절하시겠습니까?')) return;
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'rejected' } : b));
        await supabase.from('bookings').update({ status: 'rejected' }).eq('id', id);
        alert(`${companyId}의 ${userId}님 예약을 거절했습니다.`);
    };

    const handleAdminCancel = async (id, userId, companyId) => {
        if (!window.confirm('이미 승인된 예약을 취소하시겠습니까?')) return;
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
        await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
        alert(`${companyId}의 ${userId}님 예약을 취소했습니다.`);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <header className="mb-4">
                <h1 className="text-3xl font-bold text-gray-800">관리자 대시보드</h1>
                <p className="text-gray-500 text-sm font-medium mt-1">시스템 통합 관리 및 승인</p>
            </header>

            <div className="flex bg-gray-100 p-1.5 rounded-xl w-fit mb-8 gap-1">
                <button
                    onClick={() => setActiveTab('bookings')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'bookings' ? 'bg-white text-mint-500 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    예약 관리
                </button>
                <button
                    onClick={() => setActiveTab('companies')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'companies' ? 'bg-white text-mint-500 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    회사 관리
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white text-mint-500 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    사용자 관리
                </button>
            </div>

            {activeTab === 'bookings' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">신청일</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">입주사 / 신청자</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">회의실 / 인원</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">신청 사유</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">예약 일시</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {bookings.map((booking) => (
                                <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 text-xs text-gray-500 font-medium">{new Date(booking.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-800">{booking.companies?.name || booking.company_id}</div>
                                        <div className="flex flex-col mt-0.5">
                                            <span className="text-xs text-gray-500 font-medium">{booking.user_id}</span>
                                            <div className="flex flex-col text-[10px] text-gray-400 mt-0.5">
                                                <span>{booking.user_email}</span>
                                                <span>{booking.user_phone}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-800">{booking.room_name}</div>
                                        <div className="text-[10px] text-gray-400 font-medium">참석 {booking.attendees_count || '-'}명</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{booking.booking_reason || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <div className="text-xs font-bold text-mint-500">{new Date(booking.start_time).toLocaleDateString()}</div>
                                        <div className="flex items-center gap-1 text-gray-500">
                                            <Clock className="w-3 h-3" />
                                            {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ~ {new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {booking.status === 'pending' ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleApprove(booking.id, booking.user_id, booking.company_id)} className="px-3 py-1.5 bg-mint-400 text-white text-xs font-bold rounded-lg hover:bg-mint-500 transition-colors">승인</button>
                                                <button onClick={() => handleReject(booking.id, booking.user_id, booking.company_id)} className="px-3 py-1.5 bg-red-400 text-white text-xs font-bold rounded-lg hover:bg-red-500 transition-colors">거절</button>
                                            </div>
                                        ) : booking.status === 'approved' ? (
                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className="text-mint-500 font-bold text-xs uppercase italic bg-mint-50 px-2 py-1 rounded">Approved</span>
                                                <button
                                                    onClick={() => handleAdminCancel(booking.id, booking.user_id, booking.company_id)}
                                                    className="text-[10px] font-bold text-gray-400 hover:text-red-400 transition-colors underline underline-offset-2"
                                                >
                                                    예약 취소
                                                </button>
                                            </div>
                                        ) : booking.status === 'rejected' ? (
                                            <span className="text-red-500 font-bold text-xs uppercase italic bg-red-50 px-2 py-1 rounded">Rejected</span>
                                        ) : (
                                            <span className="text-gray-400 font-bold text-xs uppercase italic bg-gray-50 px-2 py-1 rounded">Cancelled</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'companies' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">등록 회사 목록</h2>
                            <p className="text-sm text-gray-500 font-medium">현재 시스템에 등록된 모든 회사 정보입니다.</p>
                        </div>
                        <button
                            onClick={() => setIsCompanyModalOpen(true)}
                            className="bg-mint-400 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-mint-500 transition-all shadow-lg shadow-mint-100 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> 추가하기
                        </button>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">회사명</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">회사 ID</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">상태</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">멤버 수</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">서비스 만료일</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loadingCompanies ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic">회사 정보를 불러오는 중입니다...</td>
                                    </tr>
                                ) : companies.length > 0 ? (
                                    companies.map(c => {
                                        const isExpired = c.valid_until && new Date(c.valid_until) < new Date();
                                        const isActive = c.is_active && !isExpired;

                                        return (
                                            <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-800">{c.name}</div>
                                                    <div className="text-[10px] text-gray-400 font-medium">생성: {new Date(c.created_at).toLocaleDateString()}</div>
                                                </td>
                                                <td className="px-6 py-4"><code className="bg-mint-50 text-mint-600 px-2 py-1 rounded text-xs font-bold tracking-widest">{c.id}</code></td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.is_active ? (isExpired ? 'bg-amber-50 text-amber-500' : 'bg-mint-50 text-mint-500') : 'bg-red-50 text-red-500'}`}>
                                                            {c.is_active ? (isExpired ? 'Expired' : 'Active') : 'Inactive'}
                                                        </span>
                                                        <button
                                                            onClick={() => handleToggleActive(c.id, c.is_active)}
                                                            className="text-[9px] font-bold text-gray-400 hover:text-mint-500 transition-colors"
                                                        >
                                                            {c.is_active ? '비활성화하기' : '활성화하기'}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCompanyMembers({ name: c.name, members: c.members });
                                                            setIsMemberModalOpen(true);
                                                        }}
                                                        className="px-3 py-1 bg-gray-50 hover:bg-mint-50 text-gray-600 hover:text-mint-600 rounded-lg text-xs font-bold transition-all border border-gray-100 flex items-center justify-center gap-1.5 mx-auto"
                                                    >
                                                        <Users className="w-3 h-3" />
                                                        {c.memberCount}명
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <input
                                                        type="date"
                                                        className={`text-xs font-medium border-0 bg-gray-50 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-mint-200 ${isExpired ? 'text-red-500' : 'text-gray-600'}`}
                                                        value={c.valid_until ? c.valid_until.split('T')[0] : ''}
                                                        onChange={(e) => handleUpdateExpiry(c.id, e.target.value)}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic">등록된 회사 정보가 없습니다.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">이름</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">이메일 / 연락처</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">소속 회사 (ID)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {users.map((u, i) => (
                                <tr key={i}>
                                    <td className="px-6 py-4 font-bold text-gray-800">{u.name}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-700">{u.email}</div>
                                        <div className="text-xs text-gray-400">{u.phone}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{u.company_name}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {/* 회사 추가 모달 */}
            {isCompanyModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-mint-400" />
                                    신규 회사 등록
                                </h3>
                                <button
                                    onClick={() => {
                                        setIsCompanyModalOpen(false);
                                        setNewCompanyName('');
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block px-1">회사 이름</label>
                                    <input
                                        type="text"
                                        value={newCompanyName}
                                        onChange={(e) => setNewCompanyName(e.target.value)}
                                        placeholder="등록하실 회사명을 입력해주세요"
                                        autoFocus
                                        className="w-full bg-gray-50 border border-transparent focus:border-mint-400 focus:bg-white rounded-xl px-4 py-3 text-sm transition-all outline-none"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleCreateCompany();
                                        }}
                                    />
                                    <p className="mt-2 text-[11px] text-gray-400 italic font-medium px-1">* 생성 후 부여되는 8자리 ID를 입주사에 전달해 주세요.</p>
                                </div>
                            </div>

                            <div className="mt-10 flex gap-3">
                                <button
                                    onClick={() => {
                                        setIsCompanyModalOpen(false);
                                        setNewCompanyName('');
                                    }}
                                    className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleCreateCompany}
                                    disabled={!newCompanyName.trim()}
                                    className="flex-1 px-6 py-3 bg-mint-400 hover:bg-mint-500 disabled:bg-gray-200 text-white rounded-xl text-sm font-bold shadow-lg shadow-mint-100 transition-all active:scale-95"
                                >
                                    추가하기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 회사별 멤버 목록 모달 */}
            {isMemberModalOpen && selectedCompanyMembers && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-800 mb-1">{selectedCompanyMembers.name}</h3>
                                    <p className="text-gray-400 text-sm font-medium">가입된 멤버 총 {selectedCompanyMembers.members.length}명</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsMemberModalOpen(false);
                                        setSelectedCompanyMembers(null);
                                    }}
                                    className="p-3 hover:bg-gray-100 rounded-2xl text-gray-400 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                {selectedCompanyMembers.members.length > 0 ? (
                                    <div className="grid gap-3">
                                        {selectedCompanyMembers.members.map((m, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-mint-200 hover:bg-white transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-mint-100 text-mint-600 rounded-xl flex items-center justify-center font-bold">
                                                        {m.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-800">{m.name}</div>
                                                        <div className="text-xs text-gray-400 font-medium">{m.email}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-bold text-gray-500">{m.phone}</div>
                                                    <div className="text-[10px] text-gray-300 mt-0.5">{new Date(m.created_at).toLocaleDateString()} 가입</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        <p className="text-gray-400 text-sm">아직 가입된 멤버가 없습니다.</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 flex justify-end">
                                <button
                                    onClick={() => {
                                        setIsMemberModalOpen(false);
                                        setSelectedCompanyMembers(null);
                                    }}
                                    className="px-8 py-3.5 bg-gray-800 text-white rounded-2xl font-bold text-sm hover:bg-gray-900 transition-all active:scale-95 shadow-lg shadow-gray-200"
                                >
                                    확인
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPage;
