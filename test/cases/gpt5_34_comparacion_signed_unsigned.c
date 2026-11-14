#include <stdio.h>
int main() {
    int A = -1;
    unsigned int B = 1;
    printf("%d %u\n", A < B, (unsigned int)A);
}
