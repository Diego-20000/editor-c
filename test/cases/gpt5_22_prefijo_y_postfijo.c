#include <stdio.h>
int main() {
    int A = 4;
    int POST = A++;
    int PRE = ++A;
    printf("%d %d %d\n", POST, PRE, A);
}
