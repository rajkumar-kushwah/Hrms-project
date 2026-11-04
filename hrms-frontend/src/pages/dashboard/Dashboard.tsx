import PunchCard from '../punchCard/PunchCard';
import DashboardStats from './DashboardStats'
import { useAuthStore } from '@/store/auth.store'
import { isEmployeeRole } from '@/utilis/roleUtils'

function Dashboard() {
  const { user } = useAuthStore();
  const isEmployee = isEmployeeRole(user?.role?.name);

  return (
    <div className='flex flex-col gap-4'>
      {/* sirf Employee ko punch-in punch-out show krega */}
      {isEmployee && <PunchCard />}
      <DashboardStats />
     
    </div>
  )
}

export default Dashboard
