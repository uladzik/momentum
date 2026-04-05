import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export function Dashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Agents Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default">Deploy Agent</Button>
        <Button variant="ghost">View Logs</Button>
      </CardContent>
    </Card>
  )
}
