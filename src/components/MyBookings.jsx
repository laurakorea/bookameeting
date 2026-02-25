import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Clock, Calendar, XCircle, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';

const MyBookings = ({ user }) => {
    const [myBookings, setMyBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyBookings();
    }, []);

    const fetchMyBookings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('company_id', user.companyId)
            .eq('user_id', user.name)
            .order('start_time', { ascending: false });

        if (error) {
            console.error('Error fetching my bookings:', error);
        } else {
            setMyBookings(data || []);
        }
        setLoading(false);
    };

    const handleCancel = async (bookingId) => {
        if (!window.confirm('정말 이 예약을 취소하시겠습니까?')) return;

        const { error } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', bookingId);

        if (error) {
            alert('예약 취소 중 오류가 발생했습니다: ' + error.message);
        } else {
            alert('예약이 취소되었습니다.');
            fetchMyBookings();
        }
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'approved':
                return { label: '승인됨', color: 'text-mint-700 bg-mint-100', icon: <CheckCircle className="w-4 h-4" /> };
            case 'cancelled':
                return { label: '취소됨', color: 'text-gray-500 bg-gray-100', icon: <XCircle className="w-4 h-4" /> };
            case 'rejected':
                return { label: '거절됨', color: 'text-red-700 bg-red-100', icon: <XCircle className="w-4 h-4" /> };
            default:
                return { label: '대기중', color: 'text-amber-700 bg-amber-100', icon: <AlertCircle className="w-4 h-4" /> };
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="text-sm font-medium">예약 내역을 불러오는 중입니다...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2 px-2">
                <h2 className="text-lg font-bold text-gray-800">내 예약 내역</h2>
                <span className="text-xs text-gray-400 font-medium">총 {myBookings.length}건</span>
            </div>

            {myBookings.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-400 text-sm">예약 내역이 없습니다.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {myBookings.map((booking) => {
                        const statusInfo = getStatusInfo(booking.status);
                        const canCancel = (booking.status === 'approved' || booking.status === 'pending') &&
                            isAfter(parseISO(booking.start_time), new Date());

                        return (
                            <div key={booking.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${statusInfo.color}`}>
                                            {statusInfo.icon}
                                            {statusInfo.label}
                                        </div>
                                        <span className="text-xs font-bold text-gray-800">{booking.room_name}</span>
                                    </div>
                                    {canCancel && (
                                        <button
                                            onClick={() => handleCancel(booking.id)}
                                            className="text-[11px] font-bold text-red-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                                        >
                                            예약 취소
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span className="text-xs font-medium">{format(parseISO(booking.start_time), 'yyyy년 MM월 dd일')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span className="text-xs font-medium">
                                            {format(parseISO(booking.start_time), 'HH:mm')} ~ {format(parseISO(booking.end_time), 'HH:mm')}
                                        </span>
                                    </div>
                                </div>

                                {booking.booking_reason && (
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-end">
                                        <div>
                                            <p className="text-[11px] text-gray-400 font-bold uppercase mb-1">사용 목적</p>
                                            <p className="text-sm text-gray-600 font-medium">{booking.booking_reason}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-300 font-bold uppercase mb-0.5">신청일시</p>
                                            <p className="text-[10px] text-gray-400 font-medium">
                                                {format(parseISO(booking.created_at), 'yyyy.MM.dd HH:mm')}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {!booking.booking_reason && (
                                    <div className="mt-4 pt-4 border-t border-gray-50 text-right">
                                        <p className="text-[10px] text-gray-300 font-bold uppercase mb-0.5">신청일시</p>
                                        <p className="text-[10px] text-gray-400 font-medium">
                                            {format(parseISO(booking.created_at), 'yyyy.MM.dd HH:mm')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MyBookings;
