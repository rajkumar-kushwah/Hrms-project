import PunchCard from '../punchCard/PunchCard';
import DashboardStats from './DashboardStats'
import { useAuthStore } from '@/store/auth.store'
import {  isAdminRole, isEmployeeRole } from '@/utilis/roleUtils'

function Dashboard() {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user);
  const isEligibleForPunch = !isAdmin && isEmployeeRole(user);

  return (
    <div className='flex flex-col gap-4'>
      {/* sirf Employee ko punch-in punch-out show krega */}
      {isEligibleForPunch && <PunchCard />}
      <DashboardStats />

    </div>
  )
}

export default Dashboard
