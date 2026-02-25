import React, { useState, useEffect } from 'react';
import { format, addDays, isWeekend, isWithinInterval, parseISO, startOfHour, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { supabase } from '../supabaseClient';
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

const Timeline = ({ user }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [bookings, setBookings] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingSlot, setPendingSlot] = useState(null); // { room, startHour, endHour }
    const [bookingReason, setBookingReason] = useState('');
    const [attendeesCount, setAttendeesCount] = useState(2);
    const [dragState, setDragState] = useState(null); // { room, startHour, currentHour }

    const rooms = ['대회의실', '중회의실 A', '중회의실 B', '포커스룸'];
    const hours = Array.from({ length: 10 }, (_, i) => i + 9); // 09:00 ~ 18:00

    // 한국 공휴일 (예시: 2026년 기준 일부)
    const HOLIDAYS = [
        '2026-01-01', // 신정
        '2026-02-16', '2026-02-17', '2026-02-18', // 설날
        '2026-03-01', // 삼일절
        '2026-05-05', // 어린이날
        '2026-05-24', // 부처님오신날
        '2026-06-06', // 현충일
        '2026-08-15', // 광복절
        '2026-09-24', '2026-09-25', '2026-09-26', // 추석
        '2026-10-03', // 개천절
        '2026-10-09', // 한글날
        '2026-12-25', // 크리스마스
    ];

    useEffect(() => {
        fetchBookings();
    }, [selectedDate]);

    const fetchBookings = async () => {
        // 선택된 날짜의 00:00:00 ~ 23:59:59 범위 조회
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from('bookings')
            .select('*, companies(name)')
            .gte('start_time', start.toISOString())
            .lte('start_time', end.toISOString())
            .in('status', ['pending', 'approved']);

        if (data) setBookings(data);
        if (error) console.error('Error fetching bookings:', error);
    };

    const isHoliday = (date) => {
        return HOLIDAYS.includes(format(date, 'yyyy-MM-dd'));
    };

    const isRestrictedTime = (date, hour) => {
        // 주말 체크
        if (isWeekend(date)) return true;
        // 공휴일 체크
        if (isHoliday(date)) return true;
        // 평일 업무 시간만 가능 (09:00 ~ 18:00) -> 이 외의 시간은 제한
        if (hour < 9 || hour >= 18) return true;

        return false;
    };

    const getBookingAt = (room, hour) => {
        return bookings.find(b => {
            const bStart = parseISO(b.start_time);
            const bEnd = parseISO(b.end_time);

            // 현재 날짜와 시간을 생성하여 범위 내에 있는지 확인
            const currentSlot = new Date(selectedDate);
            currentSlot.setHours(hour, 0, 0, 0);

            return b.room_name === room &&
                currentSlot >= bStart &&
                currentSlot < bEnd;
        });
    };

    const getCompanyColor = (companyId, status) => {
        if (status !== 'approved') return 'bg-gray-200';

        const colors = [
            'bg-mint-500 text-white',
            'bg-blue-500 text-white',
            'bg-purple-500 text-white',
            'bg-rose-500 text-white',
            'bg-amber-500 text-white',
            'bg-indigo-500 text-white',
            'bg-teal-500 text-white',
            'bg-pink-500 text-white'
        ];

        let hash = 0;
        for (let i = 0; i < companyId.length; i++) {
            hash = companyId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };

    const handleMouseDown = (room, hour) => {
        if (isRestrictedTime(selectedDate, hour) || getBookingAt(room, hour)) return;
        setDragState({ room, startHour: hour, currentHour: hour });
    };

    const handleMouseEnter = (room, hour) => {
        if (!dragState || dragState.room !== room) return;
        if (isRestrictedTime(selectedDate, hour) || getBookingAt(room, hour)) return;
        setDragState(prev => ({ ...prev, currentHour: hour }));
    };

    const handleMouseUp = () => {
        if (!dragState) return;

        const { room, startHour, currentHour } = dragState;
        const h1 = Math.min(startHour, currentHour);
        const h2 = Math.max(startHour, currentHour);

        // 범위 내에 이미 예약된 슬롯이나 제한된 슬롯이 있는지 최종 체크
        for (let h = h1; h <= h2; h++) {
            if (isRestrictedTime(selectedDate, h) || getBookingAt(room, h)) {
                setDragState(null);
                return;
            }
        }

        setPendingSlot({ room, startHour: h1, endHour: h2 + 1 });
        setIsModalOpen(true);
        setDragState(null);
    };

    // 마우스가 화면 밖에서 떼어질 경우를 대비
    useEffect(() => {
        const handleGlobalMouseUp = () => setDragState(null);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    const submitBooking = async () => {
        if (!pendingSlot) return;
        const { room, startHour, endHour } = pendingSlot;

        const bookingStart = new Date(selectedDate);
        bookingStart.setHours(startHour, 0, 0, 0);
        const bookingEnd = new Date(selectedDate);
        bookingEnd.setHours(endHour, 0, 0, 0);

        const { error } = await supabase
            .from('bookings')
            .insert([{
                company_id: user.companyId,
                user_id: user.userId,
                room_name: room,
                start_time: bookingStart.toISOString(),
                end_time: bookingEnd.toISOString(),
                status: 'pending',
                booking_reason: bookingReason,
                attendees_count: parseInt(attendeesCount)
            }]);

        if (!error) {
            alert(`${room} ${startHour}:00 - ${endHour}:00 예약을 신청했습니다.`);
            setIsModalOpen(false);
            setBookingReason('');
            setAttendeesCount(2);
            fetchBookings();
        } else {
            console.error('Error creating booking:', error);
            alert('예약 신청 중 오류가 발생했습니다: ' + error.message);
        }
    };

    // 7일 날짜 배열 생성
    const nextSevenDays = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* 날짜 선택 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex gap-2">
                    {nextSevenDays.map(date => (
                        <button
                            key={date.toISOString()}
                            onClick={() => setSelectedDate(date)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all
                ${isSameDay(selectedDate, date)
                                    ? 'bg-mint-500 text-white shadow-lg scale-105'
                                    : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                                }
                ${isWeekend(date) || isHoliday(date) ? 'opacity-60' : ''}
              `}
                        >
                            <div className="text-[10px] uppercase opacity-80">{format(date, 'eee', { locale: ko })}</div>
                            <div>{format(date, 'd일')}</div>
                        </button>
                    ))}
                </div>
                <div className="text-right">
                    <div className="text-sm font-bold text-gray-800">{format(selectedDate, 'yyyy년 MM월 dd일')}</div>
                    {(isWeekend(selectedDate) || isHoliday(selectedDate)) && (
                        <div className="text-[10px] text-red-400 font-bold flex items-center justify-end gap-1">
                            <AlertCircle className="w-3 h-3" /> 예약 불가일
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <div className="min-w-[800px]">
                    {/* 회의실 이름 헤더 */}
                    <div className="grid grid-cols-[100px_repeat(4,1fr)] sticky top-0 z-10 bg-white border-b border-gray-300 shadow-sm">
                        <div className="p-4 bg-gray-50"></div>
                        {rooms.map(room => (
                            <div key={room} className="p-4 text-center font-bold text-gray-800 text-sm border-l border-gray-300">
                                {room}
                            </div>
                        ))}
                    </div>

                    {/* 수직 타임라인 그리드 */}
                    <div className="divide-y divide-gray-300">
                        {hours.map(hour => (
                            <div key={hour} className="grid grid-cols-[100px_repeat(4,1fr)] group">
                                <div className="p-4 text-center text-xs font-bold text-gray-500 flex flex-col justify-center bg-gray-50 group-hover:bg-gray-100 transition-colors border-r border-gray-300">
                                    <span className="text-gray-800 text-sm">{hour.toString().padStart(2, '0')}:00</span>
                                    <span className="text-[10px] opacity-70">{(hour + 1).toString().padStart(2, '0')}:00</span>
                                </div>
                                {rooms.map(room => {
                                    const booking = getBookingAt(room, hour);
                                    const restricted = isRestrictedTime(selectedDate, hour);
                                    const isApproved = booking?.status === 'approved';

                                    //연속 예약 병합 로직
                                    const prevBooking = hour > 9 ? getBookingAt(room, hour - 1) : null;
                                    const nextBooking = hour < 18 ? getBookingAt(room, hour + 1) : null;

                                    const isSameAsPrev = booking && prevBooking &&
                                        booking.company_id === prevBooking.company_id &&
                                        booking.status === prevBooking.status;
                                    const isSameAsNext = booking && nextBooking &&
                                        booking.company_id === nextBooking.company_id &&
                                        booking.status === nextBooking.status;

                                    return (
                                        <div
                                            key={`${room}-${hour}`}
                                            className={`border-l border-gray-300 min-h-[72px] flex flex-col px-1.5
                                                ${isSameAsPrev ? 'pt-0' : 'pt-1'}
                                                ${isSameAsNext ? 'pb-0' : 'pb-1'}
                                            `}
                                            onMouseDown={() => handleMouseDown(room, hour)}
                                            onMouseEnter={() => handleMouseEnter(room, hour)}
                                            onMouseUp={handleMouseUp}
                                        >
                                            <div
                                                className={`w-full h-full transition-all flex items-center justify-center relative overflow-hidden group/slot select-none
                          ${isSameAsPrev ? 'rounded-t-none' : 'rounded-t-lg'}
                          ${isSameAsNext ? 'rounded-b-none' : 'rounded-b-lg'}
                           ${booking
                                                        ? getCompanyColor(booking.company_id, booking.status) + ' shadow-md scale-[0.98]'
                                                        : restricted
                                                            ? 'bg-gray-100 cursor-not-allowed border-dashed border border-gray-200 opacity-50'
                                                            : dragState && dragState.room === room &&
                                                                hour >= Math.min(dragState.startHour, dragState.currentHour) &&
                                                                hour <= Math.max(dragState.startHour, dragState.currentHour)
                                                                ? 'bg-mint-100 border-mint-200 border shadow-inner ring-2 ring-mint-400/20 rounded-lg'
                                                                : 'hover:bg-mint-50 hover:border-mint-100 border border-transparent cursor-pointer rounded-lg'
                                                    }
                        `}
                                            >
                                                {booking && !isSameAsPrev && (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xs font-bold leading-tight truncate px-1 max-w-full">
                                                            {booking.companies?.name || booking.company_id}
                                                        </span>
                                                        <div className="flex items-center gap-1 opacity-70">
                                                            <span className="text-[10px] font-medium">{isApproved ? '승인됨' : '대기중'}</span>
                                                            <span className="text-[9px] truncate">({booking.user_id})</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {booking && isSameAsPrev && (
                                                    <div className="w-full h-full flex items-center justify-center opacity-30">
                                                        <div className="w-0.5 h-full bg-white/20"></div>
                                                    </div>
                                                )}
                                                {!booking && restricted && (
                                                    <span className="text-[9px] text-gray-300 font-medium">제한됨</span>
                                                )}
                                                {!booking && !restricted && (
                                                    <div className="flex flex-col items-center">
                                                        <Plus className={`w-4 h-4 text-mint-400 transition-opacity ${dragState ? 'opacity-0' : 'opacity-0 group-hover/slot:opacity-100'}`} />
                                                        {dragState && dragState.room === room &&
                                                            hour >= Math.min(dragState.startHour, dragState.currentHour) &&
                                                            hour <= Math.max(dragState.startHour, dragState.currentHour) && (
                                                                <span className="text-[10px] text-mint-600 font-bold animate-pulse">선택 중</span>
                                                            )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 범례 */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-6 text-[11px] font-semibold text-gray-500">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-mint-400"></div>
                    <span>승인 완료</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                    <span>승인 대기</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-md border-dashed border border-gray-300 bg-gray-50/50"></div>
                    <span>예약 불가 (09시 이전/18시 이후/주말)</span>
                </div>
            </div>

            {/* 예약 모달 */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8">
                            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-mint-400" />
                                예약 신청하기
                            </h3>

                            <div className="space-y-5">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">신청 회의실 / 시간</label>
                                    <div className="bg-gray-50 rounded-xl p-4 text-sm font-medium text-gray-700">
                                        {pendingSlot?.room} | {pendingSlot?.startHour}:00 - {pendingSlot?.endHour}:00 ({pendingSlot?.endHour - pendingSlot?.startHour}시간)
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">사용 목적 (신청 사유)</label>
                                    <input
                                        type="text"
                                        value={bookingReason}
                                        onChange={(e) => setBookingReason(e.target.value)}
                                        placeholder="간단한 미팅 목적을 입력해주세요"
                                        className="w-full bg-gray-50 border border-transparent focus:border-mint-400 focus:bg-white rounded-xl px-4 py-3 text-sm transition-all outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">참석 인원</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={attendeesCount}
                                            onChange={(e) => setAttendeesCount(e.target.value)}
                                            className="w-24 bg-gray-50 border border-transparent focus:border-mint-400 focus:bg-white rounded-xl px-4 py-3 text-sm transition-all outline-none border border-gray-100"
                                        />
                                        <span className="text-sm text-gray-500 font-medium">명</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 flex gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={submitBooking}
                                    className="flex-1 px-6 py-3 bg-mint-400 hover:bg-mint-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-mint-100 transition-all active:scale-95"
                                >
                                    신청 완료
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Timeline;
