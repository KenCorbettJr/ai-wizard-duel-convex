import { currentUser } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function Dashboard() {
  const user = await currentUser()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <nav className="flex items-center justify-between p-6 bg-white/80 backdrop-blur-sm">
        <Link href="/">
          <h1 className="text-2xl font-bold text-gray-900">AI Wizard Duel</h1>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-gray-700">Welcome, {user?.firstName || 'Wizard'}!</span>
          <UserButton />
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Wizard Dashboard</h2>
          <p className="text-gray-600">Manage your magical adventures and view your battle history</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ⚔️ Quick Duel
              </CardTitle>
              <CardDescription>
                Jump into a random battle with another wizard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Find Opponent</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                👥 Challenge Friend
              </CardTitle>
              <CardDescription>
                Invite a friend to a magical duel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">Create Challenge</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📚 Spell Book
              </CardTitle>
              <CardDescription>
                View and manage your magical abilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">View Spells</Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>🏆 Battle History</CardTitle>
              <CardDescription>Your recent magical encounters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="font-medium">Victory vs. MysticMage</span>
                  <span className="text-green-600 font-bold">WIN</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="font-medium">Defeat vs. ShadowWizard</span>
                  <span className="text-red-600 font-bold">LOSS</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="font-medium">Victory vs. FireMaster</span>
                  <span className="text-green-600 font-bold">WIN</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📊 Stats</CardTitle>
              <CardDescription>Your magical prowess</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Battles:</span>
                  <span className="font-bold">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Victories:</span>
                  <span className="font-bold text-green-600">8</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Win Rate:</span>
                  <span className="font-bold">67%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rank:</span>
                  <span className="font-bold text-purple-600">Apprentice Wizard</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}