import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Booking, BookingRequest, createBooking as createBookingApi, createBookingMessage, getStudentByUserId, getTutorByUserId } from "../services/bookingApi";

// Booking store with enhanced target user interface including subjects

interface BookingState {
  showBookingModal: boolean;
  bookingTarget: {
    id: string;
    name: string;
    surname: string;
    role: 'student' | 'tutor';
    subjects?: string[];
  } | null;
  bookings: Booking[];
  isLoading: boolean;
  error: string | null;

  // Actions
  openBookingModal: (target: BookingState['bookingTarget']) => void;
  closeBookingModal: () => void;
  createBooking: (bookingData: Omit<BookingRequest, 'studentId' | 'tutorId'>) => Promise<Booking>;
  setBookings: (bookings: Booking[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      showBookingModal: false,
      bookingTarget: null,
      bookings: [],
      isLoading: false,
      error: null,

      openBookingModal: (target) => set({ 
        showBookingModal: true, 
        bookingTarget: target,
        error: null 
      }),

      closeBookingModal: () => set({ 
        showBookingModal: false, 
        bookingTarget: null,
        error: null 
      }),

      createBooking: async (bookingData) => {
        const { bookingTarget } = get();
        if (!bookingTarget) {
          set({ error: 'No booking target selected' });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Determine student and tutor IDs based on current user role
          const { user } = await import('./authStore').then(module => ({ user: module.useAuthStore.getState().user }));
          
          if (!user) {
            throw new Error('User not authenticated');
          }

          const isStudentBookingTutor = user.role === 'student' && bookingTarget.role === 'tutor';
          const isTutorBookingStudent = user.role === 'tutor' && bookingTarget.role === 'student';

          if (!isStudentBookingTutor && !isTutorBookingStudent) {
            throw new Error('Invalid booking: can only book between student and tutor');
          }

          // Get the correct student/tutor IDs
          let studentId: string;
          let tutorId: string;
          
          if (isStudentBookingTutor) {
            const student = await getStudentByUserId(user.id);
            studentId = student.id;
            tutorId = bookingTarget.id;
          } else {
            const tutor = await getTutorByUserId(user.id);
            studentId = bookingTarget.id;
            tutorId = tutor.id;
          }

          const fullBookingData: BookingRequest = {
            ...bookingData,
            studentId,
            tutorId,
          };

          const newBooking = await createBookingApi(fullBookingData);
          
          // Add to local state
          set(state => ({
            bookings: [...state.bookings, newBooking],
            isLoading: false,
            showBookingModal: false,
            bookingTarget: null
          }));

          // Return the booking data so components can handle message sending
          return newBooking;

        } catch (error) {
          console.error('Failed to create booking:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create booking',
            isLoading: false 
          });
        }
      },

      setBookings: (bookings) => set({ bookings }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: "booking-storage",
      // Only persist bookings, not modal state
      partialize: (state) => ({
        bookings: state.bookings,
      }),
    },
  ),
);
