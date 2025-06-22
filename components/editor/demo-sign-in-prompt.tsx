import { useSignIn } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DemoSignInPromptProps {
  isOpen: boolean
  onClose: () => void
  featureName: string
}

export default function DemoSignInPrompt({ isOpen, onClose, featureName }: DemoSignInPromptProps) {
  const { signIn } = useSignIn()

  const handleSignIn = () => {
    onClose()
    window.location.href = "/sign-in"
  }

  const handleSignUp = () => {
    onClose()
    window.location.href = "/sign-up"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign in to use {featureName}</DialogTitle>
          <DialogDescription>
            This feature is only available to signed-in users. Create a free account or sign in to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleSignIn}
          >
            Sign in
          </Button>
          <Button
            onClick={handleSignUp}
          >
            Create account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 