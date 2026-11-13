#include <stdio.h>
int main() {
    int R1 = 1 || 0 && 0;
    int R2 = (1 || 0) && 0;
    printf("%d %d\n", R1, R2);
}
