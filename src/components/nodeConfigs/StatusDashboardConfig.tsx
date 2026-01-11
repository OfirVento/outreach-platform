import StatusDashboard from '../StatusDashboard';

interface StatusDashboardConfigProps {
    nodeId: string;
}

export default function StatusDashboardConfig({ nodeId }: StatusDashboardConfigProps) {
    // This node just displays the dashboard component
    return (
        <div className="h-full">
            <StatusDashboard />
        </div>
    );
}
