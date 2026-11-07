#include <stdio.h>
int main() {
    int d = 1;
    switch (d) {
        case 1..3: printf("uno\n"); break;
    }
    return 0;
}
