import { Outlet, useParams } from 'react-router-dom'
import { ChatProvider } from '../context/ChatContext'
import ChatAssistant from './components/ChatAssistant'
 
export default function ProjectLayout() {
  // :id จาก URL — หน้า /project/new จะไม่มี (undefined) ใช้ '' แทนชั่วคราว
  const { id } = useParams<{ id: string }>()
  const projectId = id ?? ''
 
  return (
    <ChatProvider>
      {/* หน้าลูกแสดงตรงนี้ */}
      <Outlet />
 
      {/* แชตลอย — อยู่ทุกหน้าใต้ layout นี้ */}
      <ChatAssistant projectId={projectId} />
    </ChatProvider>
  )
}