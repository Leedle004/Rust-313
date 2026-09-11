#include <iostream>
#include <string>
#include <vector>

struct Student {
    std::string name;
    int score;
};

int main() {
    int n = 0;
    std::cin >> n;

    std::vector<Student> students;
    for (int i = 0; i < n; ++i) {
        Student s;
        std::cin >> s.name >> s.score;
        students.push_back(s);
    }

    int sum = 0;
    for (const Student& s : students) {
        sum += s.score;
    }
    const double mean = static_cast<double>(sum) / static_cast<double>(students.size());
    std::cout << mean << "\n";
    return 0;
}
