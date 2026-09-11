#include <iostream>
#include <string>
#include <vector>

struct Book {
    std::string title;
    int year;
};

int main() {
    std::vector<Book> books;
    books.push_back(Book{"The C++ Programming Language", 2013});
    books.push_back(Book{"A Tour of C++", 2022});

    for (const Book& b : books) {
        std::cout << b.title << " (" << b.year << ")\n";
    }
    return 0;
}
