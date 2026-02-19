### Project overview | cv.io

cv.io is an open source project which can manage and organize user's curriculum vitae adding an smart agent on top of it. This smart agent is a chat that can add / remove experiences to a virtual CV and export it as PDFs with different templates.

### Stack
Convex as BaaS framework + NextJS, styles with tailwind and auth with Clerk. 

### Contracts

User {
  id uid
  email string
  authId string
  createdAt Date
  updatedAt Date  
}

CV {
  id uid
  labels string[]
  experiences string[]
  skills string[]
  social { 
    linkedin string
    facebook string
    youtube string
    github string
  } ?
  contact {
    email string
    phone string
    address string ?
  }
}
