import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="flex items-center justify-between p-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Wizard Duel</h1>
        <div className="flex items-center gap-4">
          <SignedIn>
            <Link href="/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton>
              <Button>Sign In</Button>
            </SignInButton>
          </SignedOut>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to AI Wizard Duel
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Challenge your friends in epic AI-powered wizard battles. Cast spells, summon creatures, and prove your magical prowess!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>🧙‍♂️ Epic Battles</CardTitle>
              <CardDescription>
                Engage in turn-based magical combat with AI-generated spells and creatures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Each duel is unique with procedurally generated magical abilities and strategic gameplay.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>⚡ Real-time Magic</CardTitle>
              <CardDescription>
                Experience seamless multiplayer battles powered by Convex
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Challenge friends or random opponents in fast-paced magical duels.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <SignedOut>
            <SignInButton>
              <Button size="lg" className="text-lg px-8 py-3">
                Start Your Magical Journey
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <Button size="lg" className="text-lg px-8 py-3">
                Enter the Arena
              </Button>
            </Link>
          </SignedIn>
        </div>
      </main>
    </div>
  )
}