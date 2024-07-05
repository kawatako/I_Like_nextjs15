import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import Image from "next/image";

export default function ProfilePage() {
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <main className="flex-1">
        <div className="container py-12 md:py-16 lg:py-20">
          <div className="grid gap-6 md:grid-cols-[1fr_300px]">
            <div>
              <div className="flex flex-col items-center md:items-start">
                <h1 className="text-3xl font-bold">Acme Inc</h1>
                <div className="text-muted-foreground">@acmeinc</div>
              </div>
              <div className="mt-4 text-muted-foreground">
                Acme Inc is a leading provider of innovative products and
                services. We are committed to excellence and customer
                satisfaction.
              </div>
              <div className="mt-4 flex items-center gap-4 text-muted-foreground">
                <div>
                  <MapPinIcon className="w-4 h-4 mr-1 inline" />
                  San Francisco, CA
                </div>
                <div>
                  <LinkIcon className="w-4 h-4 mr-1 inline" />
                  acmeinc.com
                </div>
              </div>
              <div className="mt-6 flex items-center gap-6">
                <div className="flex flex-col items-center">
                  <div className="text-2xl font-bold">100</div>
                  <div className="text-muted-foreground">Posts</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-2xl font-bold">1.2K</div>
                  <div className="text-muted-foreground">Followers</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-2xl font-bold">500</div>
                  <div className="text-muted-foreground">Following</div>
                </div>
              </div>
              <div className="mt-6">
                <Tabs defaultValue="posts">
                  <TabsList>
                    <TabsTrigger value="posts">Posts</TabsTrigger>
                    <TabsTrigger value="media">Media</TabsTrigger>
                    <TabsTrigger value="likes">Likes</TabsTrigger>
                  </TabsList>
                  <TabsContent value="posts">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-0">
                          <Image
                            src="/placeholder.svg"
                            width={400}
                            height={400}
                            alt="Post"
                            className="object-cover aspect-square"
                          />
                        </CardContent>
                        <CardFooter className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src="/placeholder-user.jpg" />
                              <AvatarFallback>AC</AvatarFallback>
                            </Avatar>
                            <div className="text-sm font-medium">Acme Inc</div>
                          </div>
                          <Button variant="ghost" size="icon">
                            <MoveHorizontalIcon className="w-4 h-4" />
                          </Button>
                        </CardFooter>
                      </Card>
                      <Card>
                        <CardContent className="p-0">
                          <Image
                            src="/placeholder.svg"
                            width={400}
                            height={400}
                            alt="Post"
                            className="object-cover aspect-square"
                          />
                        </CardContent>
                        <CardFooter className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src="/placeholder-user.jpg" />
                              <AvatarFallback>AC</AvatarFallback>
                            </Avatar>
                            <div className="text-sm font-medium">Acme Inc</div>
                          </div>
                          <Button variant="ghost" size="icon">
                            <MoveHorizontalIcon className="w-4 h-4" />
                          </Button>
                        </CardFooter>
                      </Card>
                      <Card>
                        <CardContent className="p-0">
                          <Image
                            src="/placeholder.svg"
                            width={400}
                            height={400}
                            alt="Post"
                            className="object-cover aspect-square"
                          />
                        </CardContent>
                        <CardFooter className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src="/placeholder-user.jpg" />
                              <AvatarFallback>AC</AvatarFallback>
                            </Avatar>
                            <div className="text-sm font-medium">Acme Inc</div>
                          </div>
                          <Button variant="ghost" size="icon">
                            <MoveHorizontalIcon className="w-4 h-4" />
                          </Button>
                        </CardFooter>
                      </Card>
                    </div>
                  </TabsContent>
                  <TabsContent value="media">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-0">
                          <Image
                            src="/placeholder.svg"
                            width={400}
                            height={400}
                            alt="Media"
                            className="object-cover aspect-square"
                          />
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-0">
                          <Image
                            src="/placeholder.svg"
                            width={400}
                            height={400}
                            alt="Media"
                            className="object-cover aspect-square"
                          />
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-0">
                          <Image
                            src="/placeholder.svg"
                            width={400}
                            height={400}
                            alt="Media"
                            className="object-cover aspect-square"
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  <TabsContent value="likes">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-0">
                          <Image
                            src="/placeholder.svg"
                            width={400}
                            height={400}
                            alt="Liked Post"
                            className="object-cover aspect-square"
                          />
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-0">
                          <Image
                            src="/placeholder.svg"
                            width={400}
                            height={400}
                            alt="Liked Post"
                            className="object-cover aspect-square"
                          />
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-0">
                          <Image
                            src="/placeholder.svg"
                            width={400}
                            height={400}
                            alt="Liked Post"
                            className="object-cover aspect-square"
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            <div className="sticky top-20 self-start space-y-6">
              <Button className="w-full">Follow</Button>
              <div>
                <h3 className="text-lg font-bold">Suggested</h3>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src="/placeholder-user.jpg" />
                      <AvatarFallback>AC</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">Acme Inc</div>
                      <div className="text-muted-foreground text-sm">
                        @acmeinc
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="ml-auto">
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src="/placeholder-user.jpg" />
                      <AvatarFallback>AC</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">Acme Inc</div>
                      <div className="text-muted-foreground text-sm">
                        @acmeinc
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="ml-auto">
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src="/placeholder-user.jpg" />
                      <AvatarFallback>AC</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">Acme Inc</div>
                      <div className="text-muted-foreground text-sm">
                        @acmeinc
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="ml-auto">
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function LinkIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function MapPinIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function MountainIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
    </svg>
  );
}

function MoveHorizontalIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="18 8 22 12 18 16" />
      <polyline points="6 8 2 12 6 16" />
      <line x1="2" x2="22" y1="12" y2="12" />
    </svg>
  );
}

function PlusIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function SearchIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
