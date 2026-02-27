import { useState } from 'react';
import { api } from '../utils/api';

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: number;
  dateOfBirth: string;
  profileImage?: string;
  status: 'active' | 'inactive' | 'frozen' | 'canceled';
  gymId: string;
  branchId: string;
  membership: {
    type: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    autoRenew: boolean;
  };
  profile: {
    phone: string;
    dateOfBirth: string;
    gender: 'male' | 'female' | 'other';
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    emergencyContact: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  healthInfo: {
    medicalConditions: string[];
    allergies: string[];
    medications: string[];
    fitnessGoals: string[];
    restrictions: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemberData {
  firstName: string;
  lastName: string;
  email: string;
  branchId: string;
  profile: {
    phone: string;
    dateOfBirth: string;
    gender: 'male' | 'female' | 'other';
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    emergencyContact: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  membership: {
    type: 'basic' | 'premium' | 'vip';
    startDate: string;
    endDate: string;
    isActive: boolean;
    autoRenew: boolean;
  };
  healthInfo: {
    medicalConditions: string[];
    allergies: string[];
    medications: string[];
    fitnessGoals: string[];
    restrictions: string[];
  };
}

export const useMembers = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all members
  const fetchMembers = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    branchId?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const data = await api.members.getAll(params);
      setMembers(data.data?.members || []);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch members';
      setError(errorMessage);
      console.error('Error fetching members:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create a new member
  const createMember = async (memberData: CreateMemberData) => {
    try {
      setLoading(true);
      setError(null);

      const data = await api.members.create(memberData);
      
      // Add the new member to the list
      setMembers(prev => [data.data, ...prev]);
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create member';
      setError(errorMessage);
      console.error('Error creating member:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update a member
  const updateMember = async (memberId: string, updateData: Partial<Member>) => {
    try {
      setLoading(true);
      setError(null);

      const data = await api.members.update(memberId, updateData);
      
      // Update the member in the list
      setMembers(prev => prev.map(member => 
        member.id === memberId ? { ...member, ...data.data } : member
      ));
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update member';
      setError(errorMessage);
      console.error('Error updating member:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete a member
  const deleteMember = async (memberId: string) => {
    try {
      setLoading(true);
      setError(null);

      await api.members.delete(memberId);

      // Remove the member from the list
      setMembers(prev => prev.filter(member => member.id !== memberId));
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete member';
      setError(errorMessage);
      console.error('Error deleting member:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get member by ID
  const getMemberById = async (memberId: string) => {
    try {
      setLoading(true);
      setError(null);

      const data = await api.request(`/members/${memberId}`);
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch member';
      setError(errorMessage);
      console.error('Error fetching member:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Check membership status
  const checkMembershipStatus = async (memberId: string) => {
    try {
      const data = await api.request(`/attendance/check-membership/${memberId}`);
      return data;
    } catch (err) {
      console.error('Error checking membership status:', err);
      throw err;
    }
  };

  return {
    members,
    loading,
    error,
    fetchMembers,
    createMember,
    updateMember,
    deleteMember,
    getMemberById,
    checkMembershipStatus,
  };
};
