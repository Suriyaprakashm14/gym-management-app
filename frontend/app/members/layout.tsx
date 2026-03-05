import MembersLayout from '../components/members/MembersLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <MembersLayout>{children}</MembersLayout>;
}
