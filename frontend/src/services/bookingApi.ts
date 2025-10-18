import http from './http';

// Helper function to get student by user ID
export const getStudentByUserId = async (userId: string): Promise<{
  id: string;
  userId: string;
  name: string;
  surname: string;
  enrolledCourses: string[];
  pfp?: {
    data: string;
    contentType: string;
  };
  createdAt: string;
  updatedAt: string;
}> => {
  console.log('🔍 getStudentByUserId called with userId:', userId);
  try {
    const response = await http.get(`/students/by-user/${userId}`);
    console.log('✅ getStudentByUserId response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ getStudentByUserId failed:', error);
    throw error;
  }
};

// Helper function to get tutor ID from user ID
export const getTutorByUserId = async (userId: string): Promise<{ id: string }> => {
  const response = await http.get(`/tutors/by-user/${userId}`);
  return response.data;
};

export interface BookingRequest {
  date: string;
  time: string;
  duration: number; // in minutes
  subject: string;
  notes?: string;
  studentId: string;
  tutorId: string;
}

export interface Booking {
  id: string;
  date: string;
  time: string;
  duration: number;
  subject: string;
  notes?: string;
  studentId: string;
  tutorId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    name: string;
    surname: string;
    email: string;
  };
  tutor: {
    id: string;
    userId: string;
    name: string;
    surname: string;
    email: string;
  };
}

export interface BookingMessage {
  type: 'booking_created' | 'booking_confirmed' | 'booking_cancelled';
  bookingId: string;
  studentId: string;
  tutorId: string;
  date: string;
  time: string;
  duration: number;
  subject: string;
  notes?: string;
  message: string;
}

export const createBooking = async (bookingData: BookingRequest): Promise<Booking> => {
  console.log('📤 createBooking API call with:', bookingData);
  try {
    const response = await http.post('/bookings', bookingData);
    console.log('✅ createBooking API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ createBooking API failed:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      response: (error as any)?.response?.data,
      status: (error as any)?.response?.status
    });
    throw error;
  }
};

export const getBookings = async (): Promise<Booking[]> => {
  const response = await http.get('/bookings/my/bookings');
  return response.data;
};

export const getBookingById = async (id: string): Promise<Booking> => {
  const response = await http.get(`/bookings/${id}`);
  return response.data;
};

export const updateBookingStatus = async (id: string, status: Booking['status']): Promise<Booking> => {
  const response = await http.patch(`/bookings/${id}/status`, { status });
  return response.data;
};

export const cancelBooking = async (id: string): Promise<Booking> => {
  const response = await http.patch(`/bookings/${id}/cancel`);
  return response.data;
};

export const deleteBooking = async (id: string): Promise<void> => {
  await http.delete(`/bookings/${id}`);
};

// New booking lifecycle management endpoints
export const acceptBooking = async (id: string): Promise<Booking> => {
  const response = await http.patch(`/bookings/${id}/accept`);
  return response.data;
};

export const rejectBooking = async (id: string): Promise<void> => {
  await http.delete(`/bookings/${id}/reject`);
};

export const completeBooking = async (id: string): Promise<Booking> => {
  const response = await http.patch(`/bookings/${id}/complete`);
  return response.data;
};

// Check tutor availability for a specific time slot
export const checkTutorAvailability = async (tutorId: string, date: string, time: string, duration: number = 60): Promise<{ 
  available: boolean; 
  message?: string; 
  conflictingBooking?: {
    time: string;
    duration: number;
    endTime: string;
  }
}> => {
  try {
    const response = await http.get(`/bookings/check-availability/${tutorId}`, {
      params: { date, time, duration }
    });
    return response.data;
  } catch (error) {
    console.error('❌ checkTutorAvailability failed:', error);
    throw error;
  }
};

// Helper function to create booking message
export const createBookingMessage = (booking: Booking, type: BookingMessage['type']): BookingMessage => {
  const isStudentInitiated = type === 'booking_created';
  const recipientId = isStudentInitiated ? booking.tutorId : booking.studentId;
  const recipientName = isStudentInitiated 
    ? `${booking.tutor.name} ${booking.tutor.surname}`
    : `${booking.student.name} ${booking.student.surname}`;

  let message = '';
  switch (type) {
    case 'booking_created':
      message = `New booking request: ${booking.subject} session on ${new Date(booking.date).toLocaleDateString()} at ${booking.time} (${booking.duration} minutes)`;
      break;
    case 'booking_confirmed':
      message = `Booking confirmed: ${booking.subject} session on ${new Date(booking.date).toLocaleDateString()} at ${booking.time} (${booking.duration} minutes)`;
      break;
    case 'booking_cancelled':
      message = `Booking cancelled: ${booking.subject} session on ${new Date(booking.date).toLocaleDateString()} at ${booking.time}`;
      break;
  }

  return {
    type,
    bookingId: booking.id,
    studentId: booking.studentId,
    tutorId: booking.tutorId,
    date: booking.date,
    time: booking.time,
    duration: booking.duration,
    subject: booking.subject,
    notes: booking.notes,
    message
  };
};
